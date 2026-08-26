const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ridesCol = mongoose.connection.collection('rides');
  const rides = await ridesCol.find({ status: 'closed' }).toArray();
  console.log('Total closed rides:', rides.length);

  let updatedCount = 0;
  for (const r of rides) {
    const sTime = r.startTime ? new Date(r.startTime) : (r.date ? new Date(r.date) : new Date(r.createdAt));
    let eTime = r.endTime ? new Date(r.endTime) : null;

    if (!eTime || isNaN(eTime.getTime()) || eTime.getTime() <= sTime.getTime()) {
      let calcEndTime;
      if (r.updatedAt && new Date(r.updatedAt).getTime() > sTime.getTime() + 60000) {
        calcEndTime = new Date(r.updatedAt);
      } else if (r.rides && r.rides > 0) {
        // Estimar tempo baseado em número de corridas (~22 min por corrida)
        const estMinutes = Math.round(r.rides * 22);
        calcEndTime = new Date(sTime.getTime() + estMinutes * 60000);
      } else if (r.kmTotal && r.kmTotal > 0) {
        // Estimar tempo baseado na quilometragem percorrida (~25 km/h)
        const estMinutes = Math.max(20, Math.round((r.kmTotal / 25) * 60));
        calcEndTime = new Date(sTime.getTime() + estMinutes * 60000);
      }

      if (calcEndTime) {
        await ridesCol.updateOne({ _id: r._id }, { $set: { endTime: calcEndTime } });
        updatedCount++;
      }
    }
  }

  console.log('Successfully updated rides with estimated/restored endTime:', updatedCount);

  // Re-calcular totais mensais
  const allClosed = await ridesCol.find({ status: 'closed' }).toArray();
  const monthly = {};
  for (const r of allClosed) {
    const d = new Date(r.date || r.createdAt);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const sTime = new Date(r.startTime || r.date || r.createdAt).getTime();
    const eTime = new Date(r.endTime || r.createdAt).getTime();
    const diffHours = (eTime > sTime) ? (eTime - sTime) / 3600000 : 0;
    monthly[monthKey] = (monthly[monthKey] || 0) + diffHours;
  }

  console.log('Hours summary per month:');
  Object.keys(monthly).sort().forEach(k => {
    console.log(`  ${k}: ${monthly[k].toFixed(1)} horas`);
  });

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
