const { ethers } = require('ethers');
const { google } = require('googleapis');
const admin = require('firebase-admin');

// Initialize Firebase Admin using default GCP credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

class YouTubeValidator {
  constructor() {
    // RPC + Wallet
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);

    // Load ABI
    const artifact = require('./abi.json');
    const abi = artifact.abi || artifact;
    this.contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      abi,
      this.wallet
    );

    // YouTube API
    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });

    this.channelId = process.env.YOUTUBE_CHANNEL_ID;
    this.stateRef = db.collection('youtubeValidators').doc(this.channelId);
  }

  async loadPreviousStats() {
    const doc = await this.stateRef.get();
    return doc.exists ? doc.data() : { views: 0, subscribers: 0 };
  }

  async saveStats(stats) {
    await this.stateRef.set(stats);
  }

  async fetchStats() {
    const res = await this.youtube.channels.list({
      part: 'statistics',
      id: this.channelId,
      fields: 'items(statistics(viewCount,subscriberCount))'
    });

    const st = res.data.items?.[0]?.statistics || {};
    return {
      views: Number(st.viewCount || 0),
      subscribers: Number(st.subscriberCount || 0)
    };
  }

  async validateAndMint() {
    const prev = await this.loadPreviousStats();
    const curr = await this.fetchStats();

    const deltaSubs = curr.subscribers - prev.subscribers;
    const deltaViews = curr.views - prev.views;
    const toMint = Math.floor(deltaSubs / 10) * 100 + Math.floor(deltaViews / 20) * 5;

    console.log(`📊 Current:     ${curr.subscribers} subs / ${curr.views} views`);
    console.log(`📉 Previous:    ${prev.subscribers} subs / ${prev.views} views`);
    console.log(`🧮 Delta:       +${deltaSubs} subs / +${deltaViews} views`);
    console.log(`🔢 To Mint:     ${toMint} zsTB`);

    if (toMint <= 0) {
      console.log('🚫 Nothing to mint.');
      return;
    }

    try {
      console.log(`🪙 Minting ${toMint} zsTB to ${process.env.RECIPIENT_ADDRESS}...`);
      const tx = await this.contract.mintFromOracle(
        process.env.RECIPIENT_ADDRESS,
        toMint,
        this.channelId,
        'Auto-Oracle',
        deltaViews,
        deltaSubs
      );
      await tx.wait();
      console.log('✅ Tx Hash:', tx.hash);

      // Save latest stats
      await this.saveStats(curr);

      // Log mint to subcollection
      await this.stateRef.collection('mints').add({
        timestamp: new Date(),
        to: process.env.RECIPIENT_ADDRESS,
        minted: toMint,
        deltaViews,
        deltaSubs,
        prev,
        curr,
        txHash: tx.hash
      });

      console.log('📥 Mint logged in Firestore.');
    } catch (err) {
      console.error('❌ Mint failed:', err.message);
    }
  }
}

module.exports = YouTubeValidator;
