import os
import sys
from huggingface_hub import InferenceClient

prompt = sys.stdin.read().strip()
client = InferenceClient(provider="fal-ai", api_key=os.environ["HF_TOKEN"])
image = client.text_to_image(prompt, model=os.environ.get("HF_IMAGE_MODEL", "krea/Krea-2-Turbo"))
output = os.environ["HF_IMAGE_OUTPUT"]
image.save(output, format="PNG")
print(output)
