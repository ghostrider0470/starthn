# Generate Image

Generate an image using Azure OpenAI DALL-E via the project's image generation script.

## Usage

```
/generate-image <description> [--output path/to/image.webp]
```

## Instructions

The user has invoked this command with: `$ARGUMENTS`

Parse the arguments:
- Everything before `--output` is the image prompt/description
- `--output` specifies where to save the image (relative to project root)

If no `--output` path is provided, ask the user where they want to save it. Suggest `public/` as the base directory (e.g., `public/blog/image-name.webp`).

Once you have both the prompt and output path, run:

```bash
npm run image:generate -- --prompt "<prompt>" --output "<output>" --force
```

### Guidelines for good prompts

- Be specific about style: "clean flat illustration", "photorealistic", "minimalist vector"
- Include relevant context: what it's for (blog header, certificate background, hero image)
- Mention color palette if relevant (e.g., "using deep navy and gold tones")
- Keep prompts under 200 words for best results

### After generation

- Confirm the image was saved successfully
- Show the relative path so the user can reference it in code (e.g., `/certificates/image.webp`)
- Ask if they want to regenerate with a different prompt or adjust the output
