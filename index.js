const express = require('express')
const cors = require('cors')
const app = express()
const dotenv = require('dotenv')
dotenv.config()
const port = process.env.PORT || 5000

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173"],
  })
);


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rrkijcq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
    const CollectionOfCreateSurverys = client.db("SurverysAppDB").collection('CreateSurverysDB')
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    app.post('/surverys/create', async(req,res)=>{
        const surverys = req.body
        const result = await CollectionOfCreateSurverys.insertOne(surverys)
        res.send(result)
    })

    app.get('/surverys', async(req,res)=>{
        const result = await CollectionOfCreateSurverys.find().toArray()
        res.send(result)
    })

    app.get('/surverys/:id', async(req,res)=>{
        const surveyId = req.params.id
        const filter = {_id: new ObjectId(surveyId)}
        const result = await CollectionOfCreateSurverys.findOne(filter)
        res.send(result)
    })

    app.put("/surverys/:id", async (req, res) => {
      const { id } = req.params;
      const updatedSurvey = req.body;
    
      try {
        const result = await CollectionOfCreateSurverys.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedSurvey }
        );
    
        if (result.modifiedCount > 0) {
          res.status(200).json({ message: "Survey updated successfully" });
        } else {
          res.status(404).json({ message: "Survey not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error updating survey", error });
      }
    });
    



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
        
app.get('/', (req, res) => {
    res.send('Hello World!')
  })
  
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })