const express = require("express");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173"],
  })
);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rrkijcq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  const CollectionOfCreateSurverys = client.db("SurverysAppDB").collection("CreateSurverysDB");
  const CollectionOfUsers = client.db("SurverysAppDB").collection("UsersDB");
  const CollectionOfSurveyorReport = client.db("SurverysAppDB").collection("ReportDB");
  const CollectionOfContact = client.db("SurverysAppDB").collection("ContactUsDB");
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // user related api
    app.post('/users', async(req,res)=>{
      const user = req.body
      const filter = {email: user.email}
      const exiting = await CollectionOfUsers.findOne(filter)
      if(exiting){
        return res.send({message: 'user already exit'})
      }
      const result = await CollectionOfUsers.insertOne(user)
      res.send(result)
    })

    // show all user related api
    app.get("/users",  async (req, res) => {
      const user = req.body;
      const result = await CollectionOfUsers.find(user).toArray();
      res.send(result);
    });

    app.get('/users/:id', async(req,res)=>{
      const Id = req.params.id
      const userId = {_id: new ObjectId(Id)}
      const result = await CollectionOfUsers.findOne(userId)
      res.send(result)
    })


    // surveyor report related api
    app.post('/reports', async(req,res)=>{
      const report = req.body
      const result = await CollectionOfSurveyorReport.insertOne(report)
      res.send(result)
    })

    // show surveyor reports related api
    app.get('/reports', async(req,res)=>{
      const result = await CollectionOfSurveyorReport.find().toArray()
      res.send(result)
    })

    app.get('/reports/:id', async(req,res)=>{
      const Id = req.params.id
      const reportId = {_id: new ObjectId(Id)}
      const result = await CollectionOfSurveyorReport.findOne(reportId)
      res.send(result)
    })

    // survey create  related api
    app.post("/surverys/create", async (req, res) => {
      const surverys = req.body;
      const result = await CollectionOfCreateSurverys.insertOne(surverys);
      res.send(result);
    });

    // // show all surveys
    app.get("/surverys", async (req, res) => {
      const result = await CollectionOfCreateSurverys.find().toArray();
      res.send(result);
    });

    app.get("/surverys/:id", async (req, res) => {
      const surveyId = req.params.id;
      const filter = { _id: new ObjectId(surveyId) };
      const result = await CollectionOfCreateSurverys.findOne(filter);
      res.send(result);
    });

     // show survey by email
     app.get('/survey', async(req,res)=>{
      const user = req.query.email
      const filter = {email: user}
      const result = await CollectionOfCreateSurverys.find(filter).toArray()
      res.send(result)
    })

    app.get("/survey/:id", async (req, res) => {
      const surveyId = req.params.id;
      const filter = { _id: new ObjectId(surveyId) };
      const result = await CollectionOfCreateSurverys.findOne(filter);
      res.send(result);
    });
    
     // survey update related api
     app.patch('/survey/:id', async(req,res)=>{
      const survey  = req.body
      const surveyId = req.params.id
      const filter = {_id: new ObjectId(surveyId)}
      // Ensure `questions` is an array
      const updatedVotes = Array.isArray(survey.questions) ? survey.questions : [];
      const updateDoc = {
        $set:{
          title: survey.title,
          description: survey.description,
          deadline: survey.deadline,
          category: survey.category,
          questions: updatedVotes
        }
      }

      const result = await CollectionOfCreateSurverys.updateOne(filter, updateDoc)
      res.send(result)

    })

    // update vote
    app.put("/surverys/:id", async (req, res) => {
      const surveyId = req.params.id;
      const updatedVotes = req.body.questions[0].options;

      try {
        const result = await CollectionOfCreateSurverys.updateOne(
          { _id: new ObjectId(surveyId) },
          {
            $set: {
              "questions.0.options": updatedVotes, // Correctly sets the options field
            },
          }
        );

        if (result.modifiedCount > 0) {
          res.status(200).json({ message: "Survey updated successfully." });
        } else {
          res
            .status(404)
            .json({ message: "Survey not found or no changes made." });
        }
      } catch (error) {
        console.error("Error updating survey:", error);
        res
          .status(500)
          .json({ message: "An error occurred while updating the survey." });
      }
    });

   

    // Featured Surveys - Top 6 by votes
    app.get("/featured", async (req, res) => {
      try {
        const result = await CollectionOfCreateSurverys.aggregate([
          {
            $addFields: {
              totalVotes: {
                $sum: {
                  $map: {
                    input: "$questions",
                    as: "question",
                    in: {
                      $sum: {
                        $objectToArray: "$$question.options",
                      }.v,
                    },
                  },
                },
              },
            },
          },
          { $sort: { totalVotes: -1 } }, // Sort by total votes descending
          { $limit: 6 }, // Limit to top 6
        ]).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching featured surveys:", error);
        res.status(500).json({ message: "Error fetching featured surveys." });
      }
    });

    // Latest Surveys - Top 6 by creation date
    app.get("/latest", async (req, res) => {
      try {
        const result = await CollectionOfCreateSurverys.find()
          .sort({ _id: -1 }) // Sort by creation date descending (MongoDB's _id includes timestamp)
          .limit(6)
          .toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching latest surveys:", error);
        res.status(500).json({ message: "Error fetching latest surveys." });
      }
    });

    //  contact form related api
    app.post('/contact', async(req,res)=>{
      const user = req.body
      const result = await CollectionOfContact.insertOne(user)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
