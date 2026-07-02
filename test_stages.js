import axios from 'axios';
import 'dotenv/config';

const apiKey = '1b760e6e9fe74527bc28e72c893b8d4f';

async function test() {
  try {
    const response = await axios.get(
      "https://api.football-data.org/v4/competitions/WC/matches",
      { headers: { "X-Auth-Token": apiKey }, timeout: 6000 }
    );
    const matches = response.data.matches || [];
    const stages = new Set();
    matches.forEach(m => stages.add(m.stage));
    console.log("Stages:", Array.from(stages));
    
    // Also log sample matches of knockout stages if they exist
    const sampleKnockouts = matches.filter(m => m.stage !== 'GROUP_STAGE').slice(0, 3);
    console.log("Sample non-group matches:", JSON.stringify(sampleKnockouts, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

test();
