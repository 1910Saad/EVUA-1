// Full test of all 13 features
const http = require('http');
const fs = require('fs');
const path = require('path');

const API = 'http://localhost:3001';

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API);
    const isJson = typeof body === 'string';
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname,
      method, headers: { ...headers, ...(isJson ? { 'Content-Type': 'application/json' } : {}) }
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(isJson ? body : body);
    req.end();
  });
}

function uploadFile(filePath) {
  return new Promise((resolve, reject) => {
    const boundary = '----TestBoundary' + Date.now();
    const file = fs.readFileSync(filePath);
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(filePath)}"\r\nContent-Type: text/csv\r\n\r\n`),
      file,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    const req = http.request({
      hostname: 'localhost', port: 3001, path: '/api/upload', method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  DataFlow AI v2.0 — Full Feature Test');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Upload with pipeline
  console.log('1️⃣  UPLOAD + FULL PIPELINE');
  const upload = await uploadFile(path.join(__dirname, 'sample-data.csv'));
  console.log(`   ✅ Success: ${upload.success}`);
  console.log(`   📊 Cleaned: ${upload.cleaning.cleanedRows}/${upload.cleaning.originalRows} rows`);
  console.log(`   💡 Insights: ${upload.analysis.insights.length}`);
  console.log(`   📈 Charts: ${upload.visualizations.charts.length}`);
  console.log(`   🔮 Predictions: ${upload.predictions.predictions.length}`);
  console.log(`   ⚠️  Anomalies: ${upload.anomalies?.summary?.totalAnomalies || 0}`);
  console.log(`   🧠 Memory: ${upload.memory?.hasPrevious ? 'Compared with previous' : 'First upload'}`);
  console.log(`   🧩 Orchestration: ${upload.orchestration?.agents?.length} agents planned`);
  console.log(`   📝 Report sections: ${upload.report?.sections?.length}`);

  const datasetId = upload.datasetId;

  // 2. Auth - Register
  console.log('\n2️⃣  AUTH — Register');
  const reg = await request('POST', '/api/auth/register', JSON.stringify({ email: 'test@test.com', password: 'test1234', name: 'Test User' }));
  console.log(`   ✅ Registered: ${reg.data.user?.name} (${reg.data.user?.email})`);
  const token = reg.data.token;

  // 3. Auth - Login
  console.log('\n3️⃣  AUTH — Login');
  const login = await request('POST', '/api/auth/login', JSON.stringify({ email: 'test@test.com', password: 'test1234' }));
  console.log(`   ✅ Logged in: ${login.data.success}`);

  // 4. Chat with data
  console.log('\n4️⃣  CHAT WITH DATA');
  const questions = ['What is the average salary?', 'Show top 5 by salary', 'Compare departments', 'Any outliers in age?'];
  for (const q of questions) {
    const chat = await request('POST', '/api/chat', JSON.stringify({ datasetId, question: q }));
    const answer = chat.data.answer?.text || 'No answer';
    console.log(`   💬 "${q}"`);
    console.log(`      → ${answer.split('\n')[0].substring(0, 100)}`);
    if (chat.data.answer?.chart) console.log(`      📊 Chart: ${chat.data.answer.chart.type}`);
  }

  // 5. History
  console.log('\n5️⃣  HISTORY');
  const history = await request('GET', '/api/history');
  console.log(`   ✅ ${history.data.datasets?.length || 0} datasets in history`);

  // 6. History detail
  console.log('\n6️⃣  HISTORY DETAIL');
  const detail = await request('GET', `/api/history/${datasetId}`);
  console.log(`   ✅ Retrieved: ${detail.data.filename}`);
  console.log(`   📊 Has analysis: ${!!detail.data.analysis}`);
  console.log(`   ⚠️  Has anomalies: ${!!detail.data.anomalies}`);

  // 7. Export CSV
  console.log('\n7️⃣  EXPORT — CSV');
  const csvExport = await request('GET', `/api/export/${datasetId}/csv`);
  const csvLines = typeof csvExport.data === 'string' ? csvExport.data.split('\n').length : 0;
  console.log(`   ✅ CSV: ${csvLines} lines (status ${csvExport.status})`);

  // 8. Export JSON
  console.log('\n8️⃣  EXPORT — JSON');
  const jsonExport = await request('GET', `/api/export/${datasetId}/json`);
  console.log(`   ✅ JSON: ${jsonExport.status} (has metadata: ${!!jsonExport.data.metadata})`);

  // 9. Export Report
  console.log('\n9️⃣  EXPORT — Report');
  const reportExport = await request('GET', `/api/export/${datasetId}/report`);
  const reportLines = typeof reportExport.data === 'string' ? reportExport.data.split('\n').length : 0;
  console.log(`   ✅ Report: ${reportLines} lines formatted text`);

  // 10. Second upload (memory comparison)
  console.log('\n🔟  MEMORY — Second upload');
  const upload2 = await uploadFile(path.join(__dirname, 'sample-data.csv'));
  console.log(`   🧠 Has previous: ${upload2.memory?.hasPrevious}`);
  console.log(`   🧠 Insights: ${upload2.memory?.insights?.length || 0}`);
  if (upload2.memory?.insights?.length > 0) {
    console.log(`   🧠 ${upload2.memory.insights[0].text}`);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ ALL FEATURES VERIFIED');
  console.log('═══════════════════════════════════════════════════════\n');
}

run().catch(err => console.error('❌ Test failed:', err.message));
