const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccount = require("./firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

function getType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";

  if (value instanceof admin.firestore.Timestamp) {
    return "timestamp";
  }

  if (value instanceof admin.firestore.GeoPoint) {
    return "geopoint";
  }

  if (value instanceof admin.firestore.DocumentReference) {
    return "reference";
  }

  return typeof value;
}

function analyseValue(value) {
  const type = getType(value);

  if (type === "object") {
    const fields = {};

    for (const [key, val] of Object.entries(value)) {
      fields[key] = analyseValue(val);
    }

    return {
      type: "object",
      fields,
    };
  }

  if (type === "array") {
    const types = new Set();

    for (const item of value.slice(0, 20)) {
      types.add(getType(item));
    }

    return {
      type: "array",
      itemTypes: [...types],
    };
  }

  return {
    type,
  };
}

function analyseDocument(data) {
  const fields = {};

  for (const [key, value] of Object.entries(data)) {
    fields[key] = analyseValue(value);
  }

  return fields;
}

function mergeSchemas(target, source) {
  for (const [field, sourceInfo] of Object.entries(source)) {

    if (!target[field]) {
      target[field] = sourceInfo;
      continue;
    }

    const targetInfo = target[field];

    if (
      targetInfo.type === "object" &&
      sourceInfo.type === "object"
    ) {
      targetInfo.fields = targetInfo.fields || {};

      mergeSchemas(
        targetInfo.fields,
        sourceInfo.fields || {}
      );

      continue;
    }

    if (
      targetInfo.type === "array" &&
      sourceInfo.type === "array"
    ) {
      targetInfo.itemTypes = [
        ...new Set([
          ...(targetInfo.itemTypes || []),
          ...(sourceInfo.itemTypes || []),
        ]),
      ];

      continue;
    }

    if (targetInfo.type !== sourceInfo.type) {
      const types = new Set();

      if (targetInfo.type === "mixed") {
        for (const type of targetInfo.types || []) {
          types.add(type);
        }
      } else {
        types.add(targetInfo.type);
      }

      if (sourceInfo.type === "mixed") {
        for (const type of sourceInfo.types || []) {
          types.add(type);
        }
      } else {
        types.add(sourceInfo.type);
      }

      target[field] = {
        type: "mixed",
        types: [...types],
      };
    }
  }
}

async function analyseCollection(collectionRef) {
  console.log(`Olvasás: ${collectionRef.id}`);

  const snapshot = await collectionRef.get();

  const schema = {};
  const exampleDocuments = [];

  for (const doc of snapshot.docs) {
    const docSchema = analyseDocument(doc.data());

    mergeSchemas(schema, docSchema);

    // Csak a struktúra kerül bele, nem a valódi tartalom.
    if (exampleDocuments.length < 3) {
      exampleDocuments.push({
        id: doc.id,
        fields: docSchema,
      });
    }
  }

  return {
    documentCount: snapshot.size,
    schema,
    exampleDocuments,
  };
}

async function main() {
  console.log("");
  console.log("Firestore struktúra export indul...");
  console.log("");

  const collections = await db.listCollections();

  const output = {
    projectId: serviceAccount.project_id,
    generatedAt: new Date().toISOString(),
    collectionCount: collections.length,
    collections: {},
  };

  for (const collection of collections) {
    output.collections[collection.id] =
      await analyseCollection(collection);
  }

  const outputPath = path.join(
    __dirname,
    "firestore-structure.json"
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(output, null, 2),
    "utf8"
  );

  console.log("");
  console.log("==============================");
  console.log("EXPORT KÉSZ");
  console.log("==============================");
  console.log(`Collectionök: ${collections.length}`);
  console.log(`Fájl: ${outputPath}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("");
    console.error("HIBA:");
    console.error(error);
    process.exit(1);
  });