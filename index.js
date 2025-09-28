const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();

// middle waire
app.use(express.json());
app.use(cors());

// DB_USER = job-hunter
// DB_PASS = jTq280zqio4tHTO6



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fpoonbe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const jobCallection = client.db('JobPortal').collection('jobs');
    const jobAppCollection = client.db('JobPortal').collection('job-application');

    // jobPortal apis
    app.get('/jobs', async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email }
      }
      const cursor = jobCallection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCallection.findOne(query);
      res.send(result);
    });

    app.post('/jobs', async (req, res) => {
      const data = req.body;
      const result = await jobCallection.insertOne(data);
      res.send(result);
    })

    // job Applications apis

    app.get('/job-Application/jobs/:job_id',async(req ,res)=>{
      const jobId = req.params.job_id;
      const query = {job_id : jobId};
      const result = await jobAppCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/job-application', async (req, res) => {
      try {
        const application = req.body;
        console.log("Incoming application: ", application);

        const result = await jobAppCollection.insertOne(application);

        // not the best way (data eggregate)
        const id = application.job_id;
        const query = { _id: new ObjectId(id) };
        const job = await jobCallection.findOne(query);

        if (!job) {
          console.log("❌ Job not found for id:", id);
          return res.status(404).send({ message: "Job not found" });
        }

        const newCount = job.applicationCount ? job.applicationCount + 1 : 1;

        const updateDoc = {
          $set: { applicationCount: newCount }
        };

        const updateResult = await jobCallection.updateOne(query, updateDoc);

        console.log("Updated job application count:", updateResult);

        res.send(result);

      } catch (error) {
        console.error("Error in job application:", error);
        res.status(500).send({ message: "Server error" });
      }
    });

    app.get('/job-application', async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ message: "Email is required" })
      const result = await jobAppCollection.find({ email }).toArray();
      // fokira  way to aggregate data
      // main database theke data niye user er info er moddhe add kora
      for (const application of result) {
        const query1 = { _id: new ObjectId(application.job_id) }
        const job = await jobCallection.findOne(query1)
        if (job) {
          application.title = job.title;
          application.company = job.company;
          application.company_logo = job.company_logo;
          application.description = job.description;
        }
      }
      res.send(result);
    });

    app.patch('/job-application/:id',async(req,res)=>{
      const id = req.params.id;
      const data = req.body;
      const filter = { _id : new ObjectId(id)};
      const UpdateStatus = {
        $set:{
          status: data.status
        }
      }
      const result = await jobAppCollection.updateOne(filter,UpdateStatus);
      res.send(result);
    });

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send("job is falling down in the sky");
})

app.listen(port, () => {
  console.log(`job is running :${port}`)
})