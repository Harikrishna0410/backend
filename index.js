const {MongoClient} = require("mongodb");
const url = "mongodb+srv://harikrishna0410:XL4p4BWDbtTcHm4@transactiondetails.ueqltt2.mongodb.net/";
const client = new MongoClient(url);

async function dbConnect(){
    let result = await client.connect();
    let db = result.db("TransactionDetails");
    return db.collection("ProductDetails");
}

module.exports = dbConnect;