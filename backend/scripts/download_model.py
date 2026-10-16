import hashlib
import os
import sys
import urllib.request

MODEL_URL = os.getenv(
    "PLANT_AID_MODEL_DOWNLOAD_URL",
    "https://github.com/D-NithinTeja/Plant-Aid/releases/download/model/convnext_tiny_groundnut.ts",
)
EXPECTED_SHA256 = (
    "dbca926608c15447e16c8601e0472fb4031a1b5b153f56bb505f48b0bbeb5266"
)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
ML_DIR = os.path.join(BACKEND_DIR, "ml")
TARGET_PATH = os.path.join(ML_DIR, "convnext_tiny_groundnut.ts")
ARTIFACT_PATH = os.path.join(ML_DIR, "artifacts", "convnext_tiny_groundnut.ts")


def compute_sha256(filepath: str) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(1024 * 1024):
            hasher.update(chunk)
    return hasher.hexdigest()


def ensure_model():
    os.makedirs(ML_DIR, exist_ok=True)

    # 1. Check if model already exists in target path
    if os.path.exists(TARGET_PATH):
        if os.path.getsize(TARGET_PATH) > 100_000_000:
            print(f"[OK] Model weights already exist at {TARGET_PATH}")
            return True

    # 2. Check if model exists in artifacts path and copy/link if so
    if os.path.exists(ARTIFACT_PATH) and os.path.getsize(ARTIFACT_PATH) > 100_000_000:
        print(f"[OK] Found model in artifacts directory: {ARTIFACT_PATH}")
        if not os.path.exists(TARGET_PATH):
            import shutil
            shutil.copyfile(ARTIFACT_PATH, TARGET_PATH)
            print(f"[OK] Copied model to {TARGET_PATH}")
        return True

    # 3. Download from GitHub Release
    print(f"Downloading ConvNeXt-Tiny weights from {MODEL_URL}...")
    temp_path = TARGET_PATH + ".download"

    def progress_callback(blocks, block_size, total_size):
        downloaded = blocks * block_size
        if total_size > 0:
            percent = min(100.0, downloaded * 100.0 / total_size)
            mb_down = downloaded / (1024 * 1024)
            mb_total = total_size / (1024 * 1024)
            sys.stdout.write(f"\rStreaming: {mb_down:.1f}/{mb_total:.1f} MB ({percent:.1f}%)")
            sys.stdout.flush()

    try:
        urllib.request.urlretrieve(MODEL_URL, temp_path, reporthook=progress_callback)
        print("\nDownload complete. Verifying SHA-256...")

        actual_hash = compute_sha256(temp_path)
        if actual_hash.lower() != EXPECTED_SHA256.lower():
            print(f"[WARNING] SHA-256 mismatch! Expected {EXPECTED_SHA256}, got {actual_hash}")
        else:
            print("[OK] SHA-256 checksum verified.")

        os.replace(temp_path, TARGET_PATH)
        print(f"[SUCCESS] Model ready at {TARGET_PATH} ({os.path.getsize(TARGET_PATH)} bytes)")
        return True
    except Exception as e:
        print(f"\n[ERROR] Failed to download model: {e}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return False


if __name__ == "__main__":
    success = ensure_model()
    if not success:
        sys.exit(1)
