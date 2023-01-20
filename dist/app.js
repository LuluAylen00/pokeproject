const express = require('express');
const {join, resolve} = require('path');
const app = express();

const port = process.env.PORT || 3418;
console.log("Servidor corriendo en el puerto " + port);
app.listen(port);

app.use(express.urlencoded({extended:false})); 
app.use(express.json())

const public = resolve(__dirname, '../dist');
const static = express.static(public);
app.use(static);

app.set ('views', resolve(__dirname, '../dist'));
app.set("view engine", "ejs");

const indexRoutes = require('./routes/indexRoutes');
app.use(indexRoutes);