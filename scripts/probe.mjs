if (process.argv[2] === 'persisted') {
  const response = await fetch(
    'http://api:3000/api/v1/demo-records/00000000-0000-4000-8000-000000000001',
  );
  const record = await response.json();
  if (!response.ok || record.label !== 's-clair demo')
    throw new Error('Seeded data did not persist');
  console.log('Stored record survived without reseeding.');
  process.exit(0);
}
const unavailable = process.argv[2] === 'unavailable';
const base = 'http://api:3000/api/v1/health';
const deadline = Date.now() + 45000;
let matched = false;
while (Date.now() < deadline) {
  const [live, ready] = await Promise.all([fetch(`${base}/live`), fetch(`${base}/ready`)]);
  if (live.status === 200 && ready.status === (unavailable ? 503 : 200)) {
    matched = true;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (!matched)
  throw new Error(`Health state did not become ${unavailable ? 'unavailable' : 'ready'}`);
console.log(`Liveness OK; readiness ${unavailable ? 'detects outage' : 'recovered'}.`);
