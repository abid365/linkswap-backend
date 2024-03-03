const express = require("express");
const cors = require("cors");
const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, //access-control-allow-credentials:true
  optionsSuccessStatus: 200,
};
require("dotenv").config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const nodemailer = require("nodemailer");

const port = process.env.PORT || 3000;

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.send(`Server is running at ${port}`);
});

// *newsletter
app.post("/newsletter", async (req, res) => {
  // get payload from front-end
  const { to, subject, text } = req.body;

  // Validate that 'to' is an array of email addresses
  if (!Array.isArray(to) || to.some((email) => typeof email !== "string")) {
    return res.status(400).json({ error: "Invalid email addresses provided" });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: `${process.env.MAIL_HOLDER}`,
      pass: `${process.env.MAIL_APP_PASS}`,
    },
  });

  const mailOptions = {
    from: `${process.env.MAIL_HOLDER}`,
    to: to.join(", "),
    subject: subject,
    text: text,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      res.send(error.message);
    } else {
      res.send("Email sent: " + info.response);
    }
  });
});

// *send mail to single user
app.post("/personal-message", async (req, res) => {
  const { to, subject, message } = req.body;
  console.log(to, subject, message);
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: `${process.env.MAIL_HOLDER}`,
      pass: `${process.env.MAIL_APP_PASS}`,
    },
  });

  const mailOptions = {
    from: `${process.env.MAIL_HOLDER}`,
    to: to,
    subject: subject,
    text: message,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      res.send(error.message);
      console.log(error.message);
    } else {
      console.log(info.response);
      res.send("Email sent: " + info.response);
    }
  });
});

// mongodb config and routes

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9z4es.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // db name
    const dbName = "LinkXChange";

    // list of collections- users, offerBackLink, requestBackLink
    const usersCollection = client.db(dbName).collection("users");

    const offerBacklinkCollection = client
      .db(dbName)
      .collection("offerBacklink");

    const reqBackLinkCollection = client
      .db(dbName)
      .collection("requestBackLink");

    //* get all the users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
      console.log(result);
    });

    // *get all users to check login credentials
    app.get("/users/login/:email", async (req, res) => {
      const userEmail = req.params.email;
      const query = { email: userEmail };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // *update/reset user defined acc pass
    app.patch("/users/reset/:id", async (req, res) => {
      const userID = req.params.id;
      // console.log(req.body);
      const { password } = req.body;
      // console.log(password);
      const query = { _id: new ObjectId(userID) };
      const updateDoc = {
        $set: { password: password },
      };
      // console.log(updateDoc);
      const user = await usersCollection.findOne(query);
      // console.log(user);
      if (user && user.createdBy === "addedByAdmin") {
        const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
        // console.log(`${result}`);
      } else {
        res.send({ message: "This user is not created by Admin" });
      }
    });

    // *get individual user details by id
    app.get("/users/details/:id", async (req, res) => {
      const userID = req.params.id;
      const query = { _id: new ObjectId(userID) };
      const response = await usersCollection.findOne(query);
      res.send(response);
    });

    // *delete users
    app.delete("/users/delete/:id", async (req, res) => {
      const userId = req.params.id;
      const query = { _id: new ObjectId(userId) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // *deactivate users
    app.patch("/users/deactivate/:id", async (req, res) => {
      const userID = req.params.id;
      const query = { _id: new ObjectId(userID) };
      const updateDoc = {
        $set: {
          activeStatus: "deactivated",
        },
      };

      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // *activate users
    app.patch("/users/activate/:id", async (req, res) => {
      const userID = req.params.id;
      const query = { _id: new ObjectId(userID) };
      const updateDoc = {
        $set: {
          activeStatus: "activated",
        },
      };

      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // *update users by admin
    app.patch("/users/update/:id", async (req, res) => {
      const userID = req.params.id;
      const query = { _id: new ObjectId(userID) };
      const updateFields = req.body;
      console.log(updateFields);
      const updateDoc = {
        $set: updateFields,
      };

      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    //* post users while create user and check if it exists or not
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // *get admins
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    //* make a specific user admin
    app.patch("/users/make-admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: `admin`,
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // *make a specific admin user
    app.patch("/users/remove-admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: `user`,
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    //* create notification for each users
    app.post("/users/notifications/:id", async (req, res) => {
      const userID = req.params.id;
      const { text, dateNotified } = req.body;
      const query = { _id: new ObjectId(userID) };
      const updateDoc = {
        $push: {
          notifications: {
            text: text,
            date: dateNotified,
          },
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // *show notifications for each users
    app.get("/users/notifications/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const notifications = user.notifications || "No events right now";
        res.send(notifications);
      }
    });

    //* post offer-backlink
    app.post("/offer-backlink", async (req, res) => {
      const offerBackLink = req.body;
      const result = await offerBacklinkCollection.insertOne(offerBackLink);
      res.send(result);
    });

    // *get all the offered-backlink to display in req backlink

    app.get("/offer-backlink/:type?", async (req, res) => {
      const type = req.params.type;
      const query = type ? { type: type } : {};
      // if (type) {
      //   const result = await offerBacklinkCollection.find(query).toArray();
      //   res.send(result);
      // }
      const result = await offerBacklinkCollection.find(query).toArray();
      res.send(result);
    });

    // *get offer-backlink
    app.get("/offer-backlink", async (req, res) => {
      const result = await offerBacklinkCollection.find().toArray();
      res.send(result);
    });

    // * get all websites submitted my logged in user from offer-backlink
    // * front-end navname My websites (previously Offer Backlink)
    app.get("/offer-backlink/submitted-sites/:email", async (req, res) => {
      const userEmail = req.params.email;
      const query = { email: userEmail };
      const result = await offerBacklinkCollection.find(query).toArray();
      res.send(result);
    });

    //* delete seleted site from offer-backlink collection
    app.delete("/offer-backlink/delete/:id", async (req, res) => {
      const siteID = req.params.id;
      const query = { _id: new ObjectId(siteID) };
      const result = await offerBacklinkCollection.deleteOne(query);
      res.send(result);
    });

    // *deactivate site from offer-backlink
    app.patch("/offer-backlink/deactivate/:id", async (req, res) => {
      const siteID = req.params.id;
      const query = { _id: new ObjectId(siteID) };
      const updateDoc = {
        $set: {
          status: "deactivated",
        },
      };
      const result = await offerBacklinkCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // *activate site from offer-backlink
    app.patch("/offer-backlink/activate/:id", async (req, res) => {
      const siteId = req.params.id;
      const query = { _id: new ObjectId(siteId) };
      const updateDoc = {
        $set: {
          status: "activated",
        },
      };
      const result = await offerBacklinkCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // *update site in offer-backlink
    app.patch("/offer-backlink/update/:id", async (req, res) => {
      const siteID = req.params.id;
      const query = { _id: new ObjectId(siteID) };
      const updateFields = req.body;
      const updateDoc = {
        $set: updateFields,
      };
      const result = await offerBacklinkCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // *post requested backlink
    app.post("/requested-backlink", async (req, res) => {
      const requestBackLink = req.body;
      const result = await reqBackLinkCollection.insertOne(requestBackLink);
      res.send(result);
    });

    // *get requested(pending) backlink by user mail
    app.get("/requested-backlink/pending/:email", async (req, res) => {
      const userEmail = req.params.email;
      // conducting multiple query, gives pending data for a specific user and also checks if the status is pending or not
      const query = {
        $and: [{ reqUserEmail: userEmail }, { status: "isPending" }],
      };
      const result = await reqBackLinkCollection.find(query).toArray();
      res.send(result);
    });

    // *add count on offer-backlink which is getting requestfrom user
    app.post("/offer-backlink/count/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      // increments count by 1 everytime when a request hits to the endpoint for a valid objecid

      try {
        const updateDoc = {
          $inc: {
            count: 1,
          },
        };
        // update the document in database
        const result = await offerBacklinkCollection.updateOne(
          query,
          updateDoc
        );

        if (result.upsertedCount === 1 || result.modifiedCount === 1) {
          res.send({ message: "Count incremented successfully" });
        } else {
          res.send({ message: "Failed to incement count" });
        }
      } catch (error) {
        res.send({ message: `Error: ${error}` });
      }
    });

    // *mark isValid: true when hitted the api
    app.patch("/offer-backlink/verify/:id", async (req, res) => {
      const siteID = req.params.id;
      const query = { _id: new ObjectId(siteID) };
      const updateDoc = {
        $set: {
          isValid: true,
        },
      };
      const result = await offerBacklinkCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // *check if the addes site is verified or not, query with email and addedSite
    app.post("/offer-backlink/check-verification", async (req, res) => {
      // const userEmail = req.params.email;
      const { siteName } = req.body;
      console.log(siteName);
      const query = {
        addedSite: siteName,
        isValid: true,
      };
      const result = await offerBacklinkCollection.findOne(query);
      // console.log(result);
      if (result && result.addedSite && result.isValid) {
        res.send({ message: `verified` });
      } else {
        res.send({ message: `notVerified` });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

// listem
app.listen(port, () => {
  console.log(`Engine is hot and running at POrt: ${port}`);
});
