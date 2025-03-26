import express from "express";
import bodyParser from "body-parser";
import OpenAI from "openai";
import dotenv from 'dotenv';
dotenv.config();
import pg from "pg";

const client = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY // This is also the default, can be omitted
});


const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
  db.connect();
const app = express();
const port = 3000
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));


app.get("/", (req, res) => {
    res.render("index.ejs");
})

app.get("/filters", (req, res) => {
    res.render("filters.ejs")
})

app.post("/resultaat", async (req, res) => {
    const { vakantie_bestemmingen, vakantie_type, vakantie_budget, vakantie_periode } = req.body;
    
    // Haal jouw AI-resultaat op
    const bestemming = await AIbestemmingMaker(vakantie_bestemmingen, vakantie_type, vakantie_budget, vakantie_periode);
    
    // Redirect met query params
    // encodeURIComponent() zorgt dat speciale karakters juist in de URL belanden
    return res.redirect(
      `/resultaat?bestemming=${encodeURIComponent(bestemming)}`
      + `&vakantie_bestemmingen=${encodeURIComponent(vakantie_bestemmingen)}`
      + `&vakantie_type=${encodeURIComponent(vakantie_type)}`
      + `&vakantie_budget=${encodeURIComponent(vakantie_budget)}`
      + `&vakantie_periode=${encodeURIComponent(vakantie_periode)}`
    );
  });
  
  // GET: toont de resultaatpagina
  app.get("/resultaat", (req, res) => {
    // Haal uit de query-string
    const { bestemming, vakantie_bestemmingen, vakantie_type, vakantie_budget, vakantie_periode } = req.query;
    
    // Als er geen data is, stuur bijv. terug naar filters
    if (!bestemming) {
      return res.redirect("/filters");
    }
  
    res.render("resultaat.ejs", {
      bestemming,
      vakantie_bestemmingen,
      vakantie_type,
      vakantie_budget,
      vakantie_periode
    });
  });


async function AIbestemmingMaker(vakantie_bestemmingen, vakantie_type, vakantie_budget, vakantie_periode) {
    const result = await db.query('SELECT * FROM vakantie_logs WHERE bestemming=$1 AND type=$2 AND budget=$3 AND periode=$4', [vakantie_bestemmingen, vakantie_type, vakantie_budget, vakantie_periode]);

    // Met pg gebruik je rowCount of result.rows.length
    const hasResults = result.rowCount > 0; 
    console.log(hasResults);

    if(hasResults == true) {
        const response = await db.query('SELECT response FROM vakantie_logs WHERE bestemming=$1 AND type=$2 AND budget=$3 AND periode=$4', [vakantie_bestemmingen, vakantie_type, vakantie_budget, vakantie_periode]);
        return result.rows[0].response
    } else {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: `geef mij de ideale bestemming gebaseerd op de volgende filters: 
                      Binnen of buiten europa: ${vakantie_bestemmingen}, 
                      Wat voor soort vakantie: ${vakantie_type}, 
                      Het budget voor de vakantie: ${vakantie_budget}, 
                      De periode van de vakantie: ${vakantie_periode}
                      `,
                      
          },
        ],
      });
      try {
        const res = await db.query("INSERT INTO vakantie_logs (bestemming, type, budget, periode, response) VALUES ($1, $2, $3, $4, $5) RETURNING *",[vakantie_bestemmingen, vakantie_type, vakantie_budget, vakantie_periode, response.choices[0].message.content.trim()] );
        console.log('Insert result:', res.rows[0]);
    } catch (error) {
        console.log(`error tijens database query : ${error}`)
    }
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error with OpenAI Chat Completion:', error);
      throw error;
    }
  }
}



app.listen(port, () => { console.log(`app is listening on ${port}`) });