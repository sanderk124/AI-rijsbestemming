import express from "express";
import bodyParser from "body-parser";
import OpenAI from "openai";
import 'dotenv/config';

const client = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY // This is also the default, can be omitted
});

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
    const { weer, reis_type, budget } = req.body;
    
    // Haal jouw AI-resultaat op
    const bestemming = await AIbestemmingMaker(weer, reis_type, budget);
    
    // Redirect met query params
    // encodeURIComponent() zorgt dat speciale karakters juist in de URL belanden
    return res.redirect(
      `/resultaat?bestemming=${encodeURIComponent(bestemming)}`
      + `&weer=${encodeURIComponent(weer)}`
      + `&type=${encodeURIComponent(reis_type)}`
      + `&budget=${encodeURIComponent(budget)}`
    );
  });
  
  // GET: toont de resultaatpagina
  app.get("/resultaat", (req, res) => {
    // Haal uit de query-string
    const { bestemming, weer, type, budget } = req.query;
    
    // Als er geen data is, stuur bijv. terug naar filters
    if (!bestemming) {
      return res.redirect("/filters");
    }
  
    res.render("resultaat.ejs", {
      bestemming,
      weer,
      type,
      budget
    });
  });


async function AIbestemmingMaker(weer, type, budget) {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: `geef mij de ideale bestemming gebaseerd op de volgende filters: 
                      Het type weer: ${weer}, 
                      Wat voor soort vakantie: ${type}, 
                      Het budget voor de vakantie: ${budget}`,
          },
        ],
      });
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error with OpenAI Chat Completion:', error);
      throw error;
    }
  }



app.listen(port, () => { console.log(`app is listening on ${port}`) });