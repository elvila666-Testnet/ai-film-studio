import "dotenv/config";
console.log("--- ENV DIAGNOSTIC ---");
console.log("GCS_BUCKET_NAME:", process.env.GCS_BUCKET_NAME);
console.log("GCP_PROJECT_ID:", process.env.GCP_PROJECT_ID);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("----------------------");
