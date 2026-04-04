import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const API_URL = 'http://localhost:8000/api';
const AUTH_HEADER = 'Bearer ht_qS_w7z9hNZCtoP-nPJo3Iz6KigIU-ZiF8gag19QhY1B3XY-8B8VbLlxV0vhjJfr7';
const IMAGES_DIR = path.resolve('./public/images/blog');

const imageMap = {
  'azure-iot-hub-enterprise-device-management-scale': 'azure_iot_hub.png',
  'azure-iot-operations-edge-intelligence-industry': 'azure_iot_ops.png',
  'digital-twins-bim-smart-building-intelligence': 'digital_twins.png',
  'cloud-native-authentication-patterns-web-apps': 'cloud_native_auth.png',
  'rfc-9457-structured-errors-cut-ai-agent-costs': 'rfc_9457.png',
  'event-driven-serverless-patterns-scale-azure': 'event_driven_serverless.png',
  'microsoft-fabric-onelake-unified-data-platform': 'ms_fabric.png',
  'claude-code-reshaping-software-engineering-2026': 'claude_code.png',
  'cosmos-db-vector-search-ai-global-distribution': 'cosmos_db.png',
  'edge-ai-inference-replacing-centralized-gpu-clusters': 'edge_ai.png',
  'azure-functions-flex-consumption-serverless-done-right': 'azure_functions.png',
  'cloudflare-2026-threat-report-lessons-defense': 'cloudflare_threat.png',
  'dotnet-10-lts-what-matters-production-teams': 'dotnet_10.png'
};

async function uploadImage(filePath) {
  const formData = new FormData();
  const fileData = fs.readFileSync(filePath);
  const blob = new Blob([fileData]);
  formData.append('image', blob, path.basename(filePath));

  const res = await fetch(`${API_URL}/manage/blog/upload-image`, {
    method: 'POST',
    headers: {
      'X-Authorization': AUTH_HEADER
    },
    body: formData
  });
  
  if (!res.ok) {
    throw new Error(`Failed to upload ${filePath}: ${await res.text()}`);
  }
  
  const data = await res.json();
  return data.url;
}

async function updateBlogPost(slug, payload) {
  const res = await fetch(`${API_URL}/manage/blog/${slug}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Authorization': AUTH_HEADER
    },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    throw new Error(`Failed to update ${slug}: ${await res.text()}`);
  }
}

async function main() {
  console.log('Fetching blog posts...');
  const res = await fetch(`${API_URL}/manage/blog`, {
    headers: { 'X-Authorization': AUTH_HEADER }
  });
  
  if (!res.ok) throw new Error('Failed to fetch blogs');
  const blogs = await res.json();
  
  console.log(`Found ${blogs.length} blogs.`);
  
  for (const blog of blogs) {
    const matchedFileName = imageMap[blog.slug];
    if (matchedFileName) {
      const baseFilePath = path.join(IMAGES_DIR, matchedFileName);
      if (!fs.existsSync(baseFilePath)) {
        console.log(`File ${baseFilePath} not found for ${blog.slug}, skipping.`);
        continue;
      }
      
      const cardFilePath = path.join(IMAGES_DIR, matchedFileName.replace('.png', '_card.png'));
      const bannerFilePath = path.join(IMAGES_DIR, matchedFileName.replace('.png', '_banner.png'));

      console.log(`Processing images for ${blog.slug}...`);
      
      // Card (800x450 - 16:9)
      await sharp(baseFilePath)
        .resize({ width: 800, height: 450, fit: 'cover', position: 'center' })
        .toFile(cardFilePath);
        
      // Banner (1200x400 - 3:1)
      await sharp(baseFilePath)
        .resize({ width: 1200, height: 400, fit: 'cover', position: 'center' })
        .toFile(bannerFilePath);
      
      console.log(`Uploading Card image...`);
      const cardUrl = await uploadImage(cardFilePath);
      
      console.log(`Uploading Banner image...`);
      const bannerUrl = await uploadImage(bannerFilePath);
      
      console.log(`Updating blog ${blog.slug}...`);
      await updateBlogPost(blog.slug, { 
        coverImage: cardUrl,
        bannerImage: bannerUrl
      });
      console.log(`Blog ${blog.slug} updated successfully.`);
    } else {
      console.log(`No image mapping found for blog ${blog.slug}`);
    }
  }
}

main().catch(console.error);
