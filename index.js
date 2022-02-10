const express=require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const ObjectId = require("mongodb").ObjectId;
const cors=require('cors');
const app=express();
const admin = require("firebase-admin");
const port=process.env.PORT||5000;
app.use(cors());
app.use(express.json());

const stripe=require('stripe')(process.env.STRIPE_SECRET)

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
// database connection link 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.imlla.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken (req,res,next){
  if(req.headers?.authorization?.startsWith('Bearer ')){
    const token =req.headers.authorization.split(' ')[1];

    try{
        const decodedUser= await admin.auth().verifyIdToken(token);
        req.decodedEmail=decodedUser.email;
    }
    catch{

    }
  }
  next()
}

async  function run(){


  try {

    await client.connect();
    const database=client.db('Happy-Shopping-Camera')
    const adminCollection=database.collection('product')
    const orderCollection=database.collection('orderDetails')
    const regUserCollection=database.collection('users')
    const revewCollection=database.collection('revew')

     // GET posted data
     app.get('/product',async(req,res)=>{
      const result=await adminCollection.find({}).toArray();
      res.send(result)
  })
     app.get('/users',async(req,res)=>{
      const result=await regUserCollection.find({}).toArray();
      res.send(result)
  })
     // GET posted data
     app.get('/revew',async(req,res)=>{
      const result=await revewCollection.find({}).toArray();
      res.send(result)
  })

  // order get api
  app.get('/orderDetails',async(req,res)=>{
    const result=await orderCollection.find({}).toArray();
    res.send(result);
   
  })

  // email verify for admin
  app.get('/users/:email',async(req,res)=>{
    const email=req.params.email;
    const query={email:email};
    const user=await regUserCollection.findOne(query);
   let isAdmin=false;
    if(user?.role === 'admin'){
      isAdmin=true
    }
    res.json({admin:isAdmin})
  })

    // Post Admin data with card
    app.post('/product',async(req,res)=>{
      const result=await adminCollection.insertOne(req.body)
      res.json(result)
     
    })

    // Post Revew
    app.post('/revew',async(req,res)=>{
      const result=await revewCollection.insertOne(req.body)
      res.json(result)
     
    })
    // post api oder details
    app.post('/orderDetails',async(req,res)=>{
      const order=req.body;
      console.log(order);
      const result=await orderCollection.insertOne(order)
      res.json(result);
     
    });

  


// save registation user in database
app.post('/users',async(req,res)=>{
  const user=req.body;
  const result=await regUserCollection.insertOne(user);
  res.json(result);
  
})

// Upsert handle,, Check Multipul user 
app.put('/users' ,async (req,res)=>{
    const user=req.body;
    console.log('put',user);
    const query={email: user.email};
    const options={upsert:true};
    const update={$set:user};
    const result= await regUserCollection.updateOne(query,update,options,)
    res.json(result)
   
});

// make admin handle
app.put('/users/admin',verifyToken,async(req,res)=>{
  const user=req.body;
  const requestMan=req.decodedEmail;
  if(requestMan){
    const requestManAccount= await regUserCollection.findOne({email:requestMan})
    if(requestManAccount.role === 'admin'){
      const filter={email: user.email};
      const updateDoc= {$set: {role:'admin' }};
      const result = await regUserCollection.updateOne(filter,updateDoc)
      res.json(result)

    }
  }

  else{
    res.status(403).json({message:"You can't access make Admin."})
  }


 
});


// payment handle

app.get('/paymentInfo/:id',async (req,res)=>{
  const id=req.params.id;
  const query={_id:ObjectId(id)};
  const result=await orderCollection.findOne(query);
  res.json(result)
})
// update payment info
app.put('/paymentInfo/:id',async (req,res)=>{
  const id=req.params.id;
  const payment=req.body;
  const filter={_id:ObjectId(id)};
  const updateDoc={
    $set:{
      payment:payment
    }
  }
  const result =await orderCollection.updateOne(filter,updateDoc);
  res.json(result)
})



// payment  intent

app.post('/create-payment-intent', async (req,res)=>{
    const paymentInformation=req.body;
    const amount =paymentInformation.price*100;
    const paymentIntent=await stripe.paymentIntents.create({
      currency:"usd",
      amount:amount,
      payment_method_types:[
       "card"
      ]
    })
    res.json({clientSecret:paymentIntent.client_secret})
})



    // Delete order data

app.delete("/orderDetails/:id", async (req, res) => {
  const result = await orderCollection.deleteOne({
    _id: ObjectId (req.params.id),
  });
  res.send(result);
});
  }
  finally{
    // await client.close()
}



  }
  
  run().catch(console.dir)
  


  app.get('/',(req,res)=>{
    res.send('Running My Server')
});


app.listen(port,()=>{
    console.log('Running Assignment-12 Server port is: ',port);
})




