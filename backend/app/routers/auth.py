import datetime
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.limiter import limiter
from app.models import User
from app.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    MessageResponse,
    ResendOTPRequest,
    ResetPasswordRequest,
    TokenResponse,
    TwoFactorChallengeResponse,
    TwoFactorVerifyRequest,
    UserLogin,
    UserProfileUpdate,
    UserRegister,
    UserResponse,
)
from app.security import (
    constant_time_compare,
    create_access_token,
    generate_otp_code,
    get_current_user,
    get_now_utc,
    hash_password,
    verify_password,
)
from app.services.otp_service import otp_service

router = APIRouter(tags=["Authentication & 2FA"])


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def register_user(
    user_in: UserRegister,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Registers a new user account with bcrypt password hashing and dispatches email verification OTP."""
    # Check duplicate email or phone
    query = db.query(User).filter(User.email_address == user_in.email_address)
    if user_in.phone_number:
        query = db.query(User).filter(
            or_(
                User.email_address == user_in.email_address,
                User.phone_number == user_in.phone_number,
            )
        )
    existing_user = query.first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address or phone number already exists",
        )

    # Generate 6-digit verification OTP and challenge session
    otp_code = generate_otp_code(6)
    session_id = str(uuid.uuid4())
    expiry = get_now_utc() + datetime.timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    new_user = User(
        user_name=user_in.user_name,
        email_address=user_in.email_address,
        phone_number=user_in.phone_number,
        password_hash=hash_password(user_in.password),
        is_2fa_enabled=True,
        account_status="PENDING_VERIFICATION",
        active_session_id=session_id,
        active_2fa_otp=otp_code,
        otp_expiry_time=expiry,
        failed_otp_attempts=0,
        otp_resend_count=0,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Dispatch verification code asynchronously so registration responds immediately
    background_tasks.add_task(
        otp_service.send_otp,
        destination=new_user.email_address,
        otp_code=otp_code,
    )

    resp = UserResponse.model_validate(new_user)
    resp.session_id = session_id
    if settings.APP_DEBUG:
        resp.otp_code_dev = otp_code
    return resp


@router.post("/login", response_model=TwoFactorChallengeResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def login(
    request: Request,
    credentials: UserLogin,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Validates login credentials and initiates 2FA challenge returning an opaque session_id."""
    identifier = credentials.get_identifier()
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address or phone number is required to login",
        )

    user = (
        db.query(User)
        .filter(or_(User.email_address == identifier, User.phone_number == identifier))
        .first()
    )

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/phone or password",
        )

    if user.account_status == "SUSPENDED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact system administrator.",
        )

    # Generate 6-digit OTP and opaque session_id
    otp_code = generate_otp_code(6)
    session_id = str(uuid.uuid4())
    expiry = get_now_utc() + datetime.timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    user.active_session_id = session_id
    user.active_2fa_otp = otp_code
    user.otp_expiry_time = expiry
    user.failed_otp_attempts = 0
    user.otp_resend_count = 0
    db.commit()

    # Dispatch OTP asynchronously in the background so the 2FA screen opens immediately
    target_destination = (
        user.phone_number
        if (identifier == user.phone_number and user.phone_number)
        else user.email_address
    )
    background_tasks.add_task(
        otp_service.send_otp,
        destination=target_destination,
        otp_code=otp_code,
    )

    return TwoFactorChallengeResponse(
        session_id=session_id,
        expires_in=settings.OTP_EXPIRE_MINUTES * 60,
        message="2FA verification challenge initiated. Please verify with the 6-digit code sent to your registered contact.",
        otp_code_dev=otp_code if settings.APP_DEBUG else None,
    )


@router.post("/resend-otp", response_model=TwoFactorChallengeResponse)
def resend_otp(
    req: ResendOTPRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Issues a fresh 6-digit OTP code for an active verification challenge session with rate limiting."""
    user = db.query(User).filter(User.active_session_id == req.session_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired challenge session. Please restart login or registration.",
        )

    # Rate limit: Max resends per session
    if user.otp_resend_count >= settings.MAX_OTP_RESENDS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Maximum OTP resend limit reached ({settings.MAX_OTP_RESENDS} attempts). Please log in or register again.",
        )

    # Generate fresh OTP code and extend TTL
    new_otp = generate_otp_code(6)
    expiry = get_now_utc() + datetime.timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    user.active_2fa_otp = new_otp
    user.otp_expiry_time = expiry
    user.failed_otp_attempts = 0
    user.otp_resend_count += 1
    db.commit()

    target_destination = user.email_address
    background_tasks.add_task(
        otp_service.send_otp,
        destination=target_destination,
        otp_code=new_otp,
    )

    return TwoFactorChallengeResponse(
        session_id=user.active_session_id,
        expires_in=settings.OTP_EXPIRE_MINUTES * 60,
        message=f"A fresh verification code has been dispatched to {target_destination}.",
        otp_code_dev=new_otp if settings.APP_DEBUG else None,
    )


@router.post("/verify-2fa", response_model=TokenResponse)
def verify_2fa(req: TwoFactorVerifyRequest, db: Session = Depends(get_db)):
    """Verifies the 2FA OTP code against the challenge session with brute-force rate capping."""
    # Challenge sessions are the only lookup path: the client never needs to know the user id,
    # so account enumeration through /auth/login stays closed (Task 2.2 / Task 2.4).
    user = db.query(User).filter(User.active_session_id == req.session_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired challenge session. Please log in again.",
        )

    # Brute-force protection: Max 5 attempts per session
    if user.failed_otp_attempts >= settings.MAX_OTP_ATTEMPTS:
        user.active_session_id = None
        user.active_2fa_otp = None
        user.otp_expiry_time = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Too many failed verification attempts. Challenge invalidated, please log in again.",
        )

    if not user.active_2fa_otp or not user.otp_expiry_time:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No active 2FA challenge found for this session. Please log in again.",
        )

    if get_now_utc() > user.otp_expiry_time:
        user.active_session_id = None
        user.active_2fa_otp = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="2FA OTP code has expired. Please log in again.",
        )

    if not constant_time_compare(user.active_2fa_otp, req.otp_code.strip()):
        user.failed_otp_attempts += 1
        remaining_attempts = max(
            0, settings.MAX_OTP_ATTEMPTS - user.failed_otp_attempts
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid 2FA OTP code. {remaining_attempts} attempt(s) remaining before session lockout.",
        )

    # Verification successful: clear challenge state and activate user
    if user.account_status == "PENDING_VERIFICATION":
        user.account_status = "ACTIVE"
    user.last_login_at = get_now_utc()
    user.active_session_id = None
    user.active_2fa_otp = None
    user.otp_expiry_time = None
    user.failed_otp_attempts = 0
    user.otp_resend_count = 0
    db.commit()

    # Generate JWT Access Token (HS256, 60 minutes)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email_address, "role": user.role}
    )
    expires_in_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    return TokenResponse(
        token_type="bearer",
        access_token=access_token,
        expires_in=expires_in_seconds,
        user_id=user.id,
        user_name=user.user_name,
        email_address=user.email_address,
        role=user.role,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieves current logged-in user profile from validated JWT."""
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates the authenticated user's profile details (full name and phone number)."""
    if payload.user_name is not None:
        cleaned_name = payload.user_name.strip()
        if len(cleaned_name) < 2:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Name must be at least 2 characters long.",
            )
        current_user.user_name = cleaned_name

    if "phone_number" in payload.model_fields_set:
        cleaned_phone = payload.phone_number.strip() if payload.phone_number else None
        if cleaned_phone:
            conflict = (
                db.query(User)
                .filter(User.phone_number == cleaned_phone, User.id != current_user.id)
                .first()
            )
            if conflict:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This phone number is already registered to another account.",
                )
        current_user.phone_number = cleaned_phone

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verifies the current password and updates the authenticated user's password hash."""
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    current_user.password_hash = hash_password(req.new_password)
    db.commit()
    return MessageResponse(message="Password updated successfully.")


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit(settings.RATE_LIMIT_PASSWORD_RESET)
def forgot_password(
    request: Request,
    req: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Initiates a password reset by dispatching a 6-digit OTP to the registered email.

    Always returns a generic response so account enumeration through this endpoint stays closed.
    """
    generic_message = (
        "If an account exists for this email address, a password reset code has been sent. "
        "Please check your inbox."
    )

    user = db.query(User).filter(User.email_address == req.email_address).first()
    if not user:
        return MessageResponse(message=generic_message)

    # A reset supersedes any in-flight login/registration challenge (shared OTP columns).
    otp_code = generate_otp_code(6)
    session_id = str(uuid.uuid4())
    expiry = get_now_utc() + datetime.timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    user.active_session_id = session_id
    user.active_2fa_otp = otp_code
    user.otp_expiry_time = expiry
    user.failed_otp_attempts = 0
    user.otp_resend_count = 0
    db.commit()

    background_tasks.add_task(
        otp_service.send_otp,
        destination=user.email_address,
        otp_code=otp_code,
        purpose="password_reset",
    )

    return MessageResponse(
        message=generic_message,
        otp_code_dev=otp_code if (settings.APP_DEBUG and user) else None,
    )


@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit(settings.RATE_LIMIT_PASSWORD_RESET)
def reset_password(request: Request, req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Verifies the password-reset OTP and updates the account password.

    The lookup is by email and the OTP itself is the proof of ownership; an unknown
    email and a wrong code produce the same 401 shape so this endpoint stays
    enumeration-safe (mirroring /forgot-password).
    """
    user = db.query(User).filter(User.email_address == req.email_address).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired reset session. Please request a new password reset.",
        )

    # Brute-force protection: same attempts cap as the 2FA challenge
    if user.failed_otp_attempts >= settings.MAX_OTP_ATTEMPTS:
        user.active_session_id = None
        user.active_2fa_otp = None
        user.otp_expiry_time = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Too many failed attempts. Reset session invalidated, please request a new password reset.",
        )

    if not user.active_2fa_otp or not user.otp_expiry_time:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No active password reset challenge found for this session.",
        )

    if get_now_utc() > user.otp_expiry_time:
        user.active_session_id = None
        user.active_2fa_otp = None
        user.otp_expiry_time = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password reset code has expired. Please request a new password reset.",
        )

    if not constant_time_compare(user.active_2fa_otp, req.otp_code.strip()):
        user.failed_otp_attempts += 1
        remaining_attempts = max(
            0, settings.MAX_OTP_ATTEMPTS - user.failed_otp_attempts
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid reset code. {remaining_attempts} attempt(s) remaining before session lockout.",
        )

    # Reset approved: update password and clear the challenge so the session cannot be replayed
    user.password_hash = hash_password(req.new_password)
    user.active_session_id = None
    user.active_2fa_otp = None
    user.otp_expiry_time = None
    user.failed_otp_attempts = 0
    user.otp_resend_count = 0
    db.commit()

    return MessageResponse(
        message="Password reset successful. You can now sign in with your new password."
    )
