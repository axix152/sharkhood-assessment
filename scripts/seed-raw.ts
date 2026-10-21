import * as fs from 'fs';
import * as path from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const RAW_MONGO_URI = process.env.MONGO_RAW_URI || 'mongodb://localhost:27017/provider_raw';

interface SeedDataset {
  fileName: string;
  targetCollection: string;
}

const DATASETS: SeedDataset[] = [
  {
    fileName: 'compero-xbyte.xbyte-raw-locations.json',
    targetCollection: 'raw_locations',
  },
  {
    fileName: 'compero-xbyte.xbyte-raw-restaurants.json',
    targetCollection: 'raw_restaurants',
  },
  {
    fileName: 'compero-xbyte.xbyte-raw-menus.json',
    targetCollection: 'raw_menus',
  },
];

function transformRawDoc(doc: any): any {
  const transformed = { ...doc };

  // Convert Extended JSON $oid to native ObjectId
  if (transformed._id && typeof transformed._id === 'object' && transformed._id.$oid) {
    try {
      transformed._id = new ObjectId(transformed._id.$oid);
    } catch {
      // Keep as is if invalid hex string
    }
  }

  // Convert Extended JSON $date to native Date
  if (transformed.createdAt && typeof transformed.createdAt === 'object' && transformed.createdAt.$date) {
    transformed.createdAt = new Date(transformed.createdAt.$date);
  }
  if (transformed.updatedAt && typeof transformed.updatedAt === 'object' && transformed.updatedAt.$date) {
    transformed.updatedAt = new Date(transformed.updatedAt.$date);
  }

  return transformed;
}

async function seed() {
  console.log(`\n🌱 [Seed] Connecting to Raw MongoDB: ${RAW_MONGO_URI}`);
  const client = new MongoClient(RAW_MONGO_URI);
  await client.connect();

  const db = client.db();
  console.log(` Connected successfully to database: '${db.databaseName}'`);

  const rawDataDir = path.resolve(__dirname, '../data/raw');

  for (const dataset of DATASETS) {
    const filePath = path.join(rawDataDir, dataset.fileName);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Warning: Raw dataset file not found at '${filePath}'. Skipping.`);
      continue;
    }

    console.log(`\n Loading '${dataset.fileName}' into '${dataset.targetCollection}'...`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const rawDocs: any[] = JSON.parse(fileContent);

    const collection = db.collection(dataset.targetCollection);

    // Clear existing collection
    await collection.deleteMany({});
    console.log(`  - Cleared existing records in '${dataset.targetCollection}'`);

    // Insert in batches of 100
    const batchSize = 100;
    let insertedTotal = 0;

    for (let i = 0; i < rawDocs.length; i += batchSize) {
      const slice = rawDocs.slice(i, i + batchSize).map(transformRawDoc);
      const res = await collection.insertMany(slice, { ordered: false });
      insertedTotal += res.insertedCount;
    }

    console.log(`  - Successfully seeded ${insertedTotal} raw documents into '${dataset.targetCollection}'`);
  }

  await client.close();
  console.log(`\n✅ [Seed] Raw staging database seeded successfully! Ready for ingestion.\n`);
}

seed().catch((err) => {
  console.error('❌ Seeding failed with error:', err);
  process.exit(1);
});
