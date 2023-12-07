const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dbConnect = require('./index');
const mongoose = require("mongoose");
const app = express();

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors());

mongoose.connect("mongodb+srv://harikrishna0410:XL4p4BWDbtTcHm4@transactiondetails.ueqltt2.mongodb.net/").then(
    () => console.log("DB connected...")
).catch(err => console.log(err))

app.get("/products/", async(req, res) => {
    const {search_q,page,limit} = req.query
    let pageNum = Number(page) || 1;
    let pageLimit = Number(limit) || 6;

    let skip = (pageNum - 1) * pageLimit;

    let data = await dbConnect();
    data = await data.find( { $or:  [{title:{$regex:search_q,$options:"i"}}, {description:{$regex:search_q,$options:"i"}}, {price:{$regex:search_q,$options:"i"}} ] }).skip(skip).limit(pageLimit).toArray();
    res.send({"succes" : data})
})

//Get Sales for month
app.get("/total-sales/:month", async(req, res)=> {
    let data = await dbConnect();
    console.log("total sale")
    data = await data.aggregate([
        // {
        //    $match: { "sold": true }
        // },
        {
          '$addFields': {'convertedDate': {'$toDate': '$dateOfSale'}}
        },
        {
          '$addFields' : { 'Month' : { $substr: [ "$convertedDate", 5, 2 ]} }
        },
        {
            $match: { "Month": req.params.month }
        },
        {
            $group :
                  {
                    _id : ["$Month","$sold"], 
                    sold_price : {  $sum : "$price" },
                    noOfsold: {$sum : 1}
                  } 
          }
        ]).toArray();
        res.send({monthValue:data})
})

//Get Price range
app.get("/price-range/:month", async(req,res) => {
    let data = await dbConnect();
    data = await data.aggregate([
        {
            '$addFields': {'range': {$ceil : { $divide: [ "$price", 100 ] } } }
          },
          {
            '$addFields': {  'price_range'  : { $cond: [ { $gte: [ "$range", 9 ] }, 10, "$range" ]  } }
          },
        {
            '$addFields': {'convertedDate': {'$toDate': '$dateOfSale'}}
          },
          {
            '$addFields' : { 'Month' : { $substr: [ "$convertedDate", 5, 2 ]} }
          },
          {
            $match: { "Month": req.params.month }
        },
        {
          $group :
                {
                  _id : ["$price_range","$Month"], 
                  sold_price : {  $sum : 1 },
                }
        },
        { $sort : { _id : 1 } }
      ]).toArray();
      res.send({priceRange:data})
})

//Get unique Categories
app.get("/unique-categories/:month", async(req, res) => {
    let data = await dbConnect();
    data = await data.aggregate([
        {
            '$addFields': {'convertedDate': {'$toDate': '$dateOfSale'}}
          },
        {
          '$addFields' : { 'Month' : { $substr: [ "$convertedDate", 5, 2 ]} }
        },
        {
            $match: { "Month": req.params.month }
        },
        {
          $group :
                {
                  _id : ["$category","$Month"], 
                  itemcount : {  $sum : 1 },
                }
        }
      ]).toArray();
      res.send({uniqueCategories: data})
})

//Get multiple fetch
app.get("/fetch-all/:month", async(req, res) => {
  let {month} = req.params;
  const api1 = () => {
    return new Promise(async(resolve) => {
      await axios.get(`http://localhost:4000/total-sales/${month}`)
       .then((res) => {
      resolve(res.data)
      })
      .catch((e) => {
        resolve(e)
       })
      
    })
  }

  const api2 = () => {
    return new Promise(async(resolve) => {
      await axios.get(`http://localhost:4000/price-range/${month}`)
       .then((res) => {
      resolve(res.data)
      })
      .catch((e) => {
        resolve(e)
       })
      
    })
  }
  const api3 = () => {
    return new Promise(async(resolve) => {
      await axios.get(`http://localhost:4000/unique-categories/${month}`)
       .then((res) => {
      resolve(res.data)
      })
      .catch((e) => {
        resolve(e)
       })
      
    })
  }
  let promises = [api1(),api2(),api3()]
  await Promise.allSettled(promises)
			.then((data) => {
        //res.send(data)
        //res.send({ans: [data[0].value,data[1].value,data[2].value] })
        res.send({
          monthValue : data[0].value.monthValue,
          priceRange : data[1].value.priceRange,
          uniqueCategories : data[2].value.uniqueCategories,
        })
			})
			 .catch((err) => {
				res.send(err)
			});
})

app.listen(4000, () => console.log("Server is Running at SPort 4000"))