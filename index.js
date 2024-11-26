const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
const app = express();
const stripe = require("stripe")(
  "sk_test_51PZmx2Ro2enkpQYdV1PdzTYYwEUam2XGqbWAnEE7CMUqysztVSfp9NBAoOfzNY5yEx1M04oMWAV5Q0THnhvi1M6500w8osQPgZ"
);
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173"],
  })
);

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

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
  const CollectionOfCreateSurverys = client
    .db("SurverysAppDB")
    .collection("CreateSurverysDB");
  const CollectionOfUsers = client.db("SurverysAppDB").collection("UsersDB");
  const CollectionOfSurveyorReport = client
    .db("SurverysAppDB")
    .collection("ReportDB");
  const CollectionOfContact = client
    .db("SurverysAppDB")
    .collection("ContactUsDB");
  const CollectionOfPayments = client
    .db("SurverysAppDB")
    .collection("PaymentsDB");
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    //creating Token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middleware
    const verifyToken = async (req, res, next) => {
      // console.log(req.headers.authorization.split(" ")[1])
      if (!req.headers.authorization) {
        res.status(401).send({ message: "unAuthorize Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      // console.log('tok  tok token', token)
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          res.status(401).send({ message: "unAuthorize Access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await CollectionOfUsers.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    // verify surveyor
    const verifySurveyor = async (req, res, next) => {
      const email = req.decoded.email;
      const filter = { email: email };
      const user = await CollectionOfUsers.findOne(filter);
      const isSurveyor = user?.role === "surveyor";
      if (!isSurveyor) {
        res.status(403).send({ message: "Forbidden  Access" });
      }
      next();
    };

    // user related api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const exiting = await CollectionOfUsers.findOne(filter);
      if (exiting) {
        return res.send({ message: "user already exit" });
      }
      const result = await CollectionOfUsers.insertOne(user);
      res.send(result);
    });

    // show all user related api
    app.get("/users", verifyToken, async (req, res) => {
      const user = req.body;
      const result = await CollectionOfUsers.find(user).toArray();
      res.send(result);
    });

    app.get("/users/:id", async (req, res) => {
      const Id = req.params.id;
      const userId = { _id: new ObjectId(Id) };
      const result = await CollectionOfUsers.findOne(userId);
      res.send(result);
    });

    // surveyor report by which user report and show ui related api
    app.post("/reports", async (req, res) => {
      const report = req.body;
      const result = await CollectionOfSurveyorReport.insertOne(report);
      res.send(result);
    });

    // show surveyor reports related api
    app.get("/reports", async (req, res) => {
      const user = req.query.email;
      const query = { email: user };
      const result = await CollectionOfSurveyorReport.find(query).toArray();
      res.send(result);
    });

    app.get("/reports/:id", async (req, res) => {
      const Id = req.params.id;
      const reportId = { _id: new ObjectId(Id) };
      const result = await CollectionOfSurveyorReport.findOne(reportId);
      res.send(result);
    });

    // survey create  related api
    app.post("/surverys/create", async (req, res) => {
      const surverys = req.body;
      const result = await CollectionOfCreateSurverys.insertOne(surverys);
      res.send(result);
    });

    // // show all surveys
    app.get("/surverys", verifyToken, async (req, res) => {
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
    app.get("/survey", verifyToken, async (req, res) => {
      const user = req.query.email;
      const filter = { email: user };
      const result = await CollectionOfCreateSurverys.find(filter).toArray();
      res.send(result);
    });

    app.get("/survey/:id", async (req, res) => {
      const surveyId = req.params.id;
      const filter = { _id: new ObjectId(surveyId) };
      const result = await CollectionOfCreateSurverys.findOne(filter);
      res.send(result);
    });

    // survey update related api
    app.patch("/survey/:id", async (req, res) => {
      const survey = req.body;
      const surveyId = req.params.id;
      const filter = { _id: new ObjectId(surveyId) };
      // Ensure `questions` is an array
      const updatedVotes = Array.isArray(survey.questions)
        ? survey.questions
        : [];
      const updateDoc = {
        $set: {
          title: survey.title,
          description: survey.description,
          deadline: survey.deadline,
          category: survey.category,
          questions: updatedVotes,
        },
      };

      const result = await CollectionOfCreateSurverys.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

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
    app.post("/contact", async (req, res) => {
      const user = req.body;
      const result = await CollectionOfContact.insertOne(user);
      res.send(result);
    });

    // ............payment intents related api....................

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      // console.log("amount", amount);
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // .........payment related api...........
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await CollectionOfPayments.insertOne(payment);
      // console.log("payment info", paymentResult);

      res.send(paymentResult);
    });

    app.get('/payments', async(req,res)=>{
      const result = await CollectionOfPayments.find().toArray()
      res.send(result)
    })

    // check admin related api
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await CollectionOfUsers.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // check surveyor related api
    app.get("/surverys/surveyor/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await CollectionOfUsers.findOne(query);
      let surveyor = false;
      if (user) {
        surveyor = user?.role === "surveyor";
      }
      res.send({ surveyor });
    });

    // Make admin related api
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const userId = req.params.id;
        const filter = { _id: new ObjectId(userId) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await CollectionOfUsers.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    // Make surverys related api
    app.patch("/surverys/surveyor/:id", verifyToken, verifySurveyor, async (req, res) => {
      const surveyId = req.params.id;
      const filter = { _id: new ObjectId(surveyId) };
      const updateDoc = {
        $set: {
          role: "surveyor",
        },
      };
      const result = await CollectionOfUsers.updateOne(filter, updateDoc);
      res.send(result);
    });

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
