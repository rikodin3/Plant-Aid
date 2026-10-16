import base64
import io
import os
import sys

# Ensure backend root is in Python path for absolute imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Handle ZeroGPU environment if active
try:
    import spaces
except ImportError:
    spaces = None

from scripts.download_model import ensure_model

# Stream and verify model weights on startup BEFORE importing app.main / ml_engine
ensure_model()

import gradio as gr
from PIL import Image

from app.main import app as fastapi_app

# ZeroGPU decorator requirement (runs as no-op so no GPU quota is burned)
if spaces is not None:
    @spaces.GPU(duration=1)
    def _noop():
        return ""

def predict_leaf(image):
    if image is None:
        return "Please upload an image.", None
    from app.services.ml_engine import ml_engine
    img_byte_arr = io.BytesIO()
    image.save(img_byte_arr, format="PNG")
    result = ml_engine.predict(img_byte_arr.getvalue())

    disease = result.get("disease_name", "Unknown")
    conf = result.get("confidence", 0.0)
    uncertain = result.get("uncertain", False)
    species = result.get("plant_species", "Groundnut (Arachis hypogaea)")

    summary = f"""### Analysis Result
- **Condition / Disease**: {disease}
- **Confidence**: {conf:.1%}
- **Calibrated Status**: {'⚠️ High Uncertainty (Verification Recommended)' if uncertain else '✅ Confident Detection'}
- **Foliage Category**: {species}
"""
    heatmap_img = None
    if result.get("cam_heatmap_b64") or result.get("heatmap_base64"):
        try:
            b64_str = result.get("cam_heatmap_b64") or result.get("heatmap_base64")
            heatmap_bytes = base64.b64decode(b64_str)
            heatmap_img = Image.open(io.BytesIO(heatmap_bytes))
        except Exception:
            heatmap_img = None

    return summary, heatmap_img

with gr.Blocks(title="Plant-Aid Production Backend & API") as demo:
    gr.Markdown("# 🌿 Plant-Aid Production Backend & Inference API")
    gr.Markdown(
        "Real-Time Groundnut Foliage Pathology Identification & Treatment Recommendation API.\n\n"
        "- **Interactive API Docs (Swagger)**: [/docs](/docs)\n"
        "- **Health Check**: [/health](/health)\n"
        "- **Active Infrastructure**: Hugging Face Spaces (ZeroGPU / 16 GB RAM • PyTorch • Neon PostgreSQL • Neon S3)\n"
    )
    with gr.Tab("Quick Diagnostic Test"):
        gr.Markdown("Upload a plant leaf photo below to test model inference and Grad-CAM lesion heatmap generation:")
        with gr.Row():
            with gr.Column():
                input_img = gr.Image(type="pil", label="Upload Leaf Photo")
                test_btn = gr.Button("Analyze Leaf", variant="primary")
            with gr.Column():
                output_text = gr.Markdown(label="Diagnosis")
                output_heatmap = gr.Image(type="pil", label="Grad-CAM Lesion Heatmap")
        test_btn.click(fn=predict_leaf, inputs=input_img, outputs=[output_text, output_heatmap])

    if spaces is not None:
        dummy_btn = gr.Button(visible=False)
        dummy_btn.click(fn=_noop)

# Mount Gradio UI onto FastAPI root
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if spaces is not None:
    try:
        from spaces import zero
        zero.startup()
    except Exception as e:
        print(f"[WARN] ZeroGPU startup call: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "7860")))
