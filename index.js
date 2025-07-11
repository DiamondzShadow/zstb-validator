require('dotenv').config();
const cron  = require('node-cron');
const YouTubeValidator = require('./validator/youtube-validator');

async function run(){
  try {
    await new YouTubeValidator().validateAndMint();
    console.log('✅ OK', new Date().toISOString());
  } catch(e){
    console.error('❌ FAIL', e.message);
  }
}

run();
cron.schedule('0 * * * *', run);

if (process.env.PORT) {
  require('http')
    .createServer((_,res)=>res.end('OK'))
    .listen(process.env.PORT, ()=>console.log(`health:${process.env.PORT}`));
}
