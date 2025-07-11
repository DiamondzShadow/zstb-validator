const { ethers } = require('ethers');
const { google } = require('googleapis');
const fs         = require('fs');
const path       = require('path');

class YouTubeValidator {
  constructor(){
    // blockchain setup
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet   = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);

    // load the artifact and pull out .abi
    const artifact = require('./abi.json');
    const abi      = artifact.abi;
    this.contract  = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      abi,
      this.wallet
    );

    // YouTube API setup
    this.youtube   = google.youtube({ version:'v3', auth: process.env.YOUTUBE_API_KEY });
    this.channelId = process.env.YOUTUBE_CHANNEL_ID;
    this.stateFile = path.resolve(__dirname, '..', 'previous_stats.json');
  }

  async fetchStats(){
    const res = await this.youtube.channels.list({
      part:   'statistics',
      id:     this.channelId,
      fields: 'items(statistics(viewCount,subscriberCount))'
    });
    const st = res.data.items?.[0]?.statistics || {};
    return { views: Number(st.viewCount||0), subscribers: Number(st.subscriberCount||0) };
  }

  loadPreviousStats(){
    try { return JSON.parse(fs.readFileSync(this.stateFile)); }
    catch { return {views:0,subscribers:0}; }
  }

  saveStats(stats){
    fs.writeFileSync(this.stateFile, JSON.stringify(stats,null,2));
  }

  async validateAndMint(){
    const prev = this.loadPreviousStats();
    const curr = await this.fetchStats();

    const deltaSubs  = curr.subscribers - prev.subscribers;
    const deltaViews = curr.views       - prev.views;
    const toMint     = Math.floor(deltaSubs/10)*100 + Math.floor(deltaViews/20)*5;

    if (toMint <= 0) {
      console.log('Nothing to mint.');
      return;
    }

    console.log('Minting', toMint, 'tokens...');
    const tx = await this.contract.mint(process.env.RECIPIENT_ADDRESS, toMint);
    await tx.wait();
    console.log('Tx hash:', tx.hash);

    this.saveStats(curr);
  }
}

module.exports = YouTubeValidator;
