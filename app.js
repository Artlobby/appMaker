const scrape = require('website-scraper');
const express = require('express');
var bodyParser = require('body-parser');
const path = require("path");
const fs = require("fs");
const cors = require("cors");
var app = express()
const auth = require("./functions/auth");
const downloader = require('./functions/downloader')
var rimraf = require("rimraf");
const { zip } = require('zip-a-folder');
const Jimp = require('jimp');
var multer  = require('multer');
const xml2js = require("xml2js");
const parseString = require("xml2js").parseString;

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './icons')
    },
    filename: function (req, file, cb) {

        cb(null, file.originalname); // modified here  or user file.mimetype
    }
});
var upload = multer({ storage: storage })
  
const dotenv = require('dotenv');
dotenv.config();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())
const port = process.env.PORT

// CORS Middleware
app.use(cors());

// Set Static Folder
app.use(express.static(path.join(__dirname, "public")));

//get user URL
app.post('/sendUrl', upload.single('icon') ,async (req, res) => {

    //validate user URL
        console.log(req.body.url);
        downloader.getName(req.body.name , res)
        let options = {
            urls: [req.body.url],
            directory: './temp/www',
        };
       // console.log();
        
        scraper(options).then(res => {
        imageResizer()
         });
    
    //download whole website
    async function scraper(options) {
        return new Promise(async function (resolve, reject) {
            console.log('scraper start..');

            if (fs.existsSync(options.directory)) {
                rimraf(options.directory, async function () {
                    console.log("Deleting www Folder...");
                    console.log('scrapping....');
                    scrape(options).then((result) => {
                        resolve();
                    });

                });
            } else {
                // with async/await
                console.log('scrapping....');
                scrape(options).then((result) => {
                    resolve();
                    console.log('done scrapping');
                });
            }

        })

    }
    //auth user in buils.phonegap with token
    async function authUser() {
        console.log('auth');

        authunticate = await auth.authUser()

    }

    function imageResizer(params) {
        console.log('start resizing');
        let iconName = req.file.filename
        //making android icons
        Jimp.read(`./icons/${iconName}`)
            .then(lenna => {
                return lenna
                .resize(192, 192, Jimp.RESIZE_NEAREST_NEIGHBOR) // resize
                .write('./Temp/res/icon/android/drawable-xxxhdpi-icon.png'); // save
                  
            }).then(lenna => {
                return lenna
                .resize(144, 144, Jimp.RESIZE_NEAREST_NEIGHBOR) // resize
                .write('./Temp/res/icon/android/drawable-xxhdpi-icon.png'); // save
         
            });
            Jimp.read(`./icons/${iconName}`)
            .then(lenna => {
                return lenna
                .resize(96, 96, Jimp.RESIZE_NEAREST_NEIGHBOR) // resize
                .write('./Temp/res/icon/android/drawable-xhdpi-icon.png'); // save
                   
            }).then(lenna => {
                return lenna
                .resize(48, 48, Jimp.RESIZE_NEAREST_NEIGHBOR) // resize
                .write('./Temp/res/icon/android/drawable-mdpi-icon.png'); // save
            });
            Jimp.read(`./icons/${iconName}`)
            .then(lenna => {
                return lenna
                .resize(72, 72, Jimp.RESIZE_NEAREST_NEIGHBOR) // resize
                .write('./Temp/res/icon/android/drawable-hdpi-icon.png'); // save
              
            }).then(lenna => {
                return lenna
                .resize(36, 36, Jimp.RESIZE_NEAREST_NEIGHBOR) // resize
                .write('./Temp/res/icon/android/drawable-ldpi-icon.png'); // save
            }).then(lenna => {
                fs.readFile("./Temp/config.xml", "utf-8", function(err, data) {
                    if (err) console.log(err);;
                    // we then pass the data to our method here
                    parseString(data, function(err, result) {
                      if (err) console.log(err);

                      var json = result;
                      json.widget.name = [req.body.name];
    
                      // create a new builder object and then convert
                      // our json back to xml.

                      var builder = new xml2js.Builder();
                      var xml = builder.buildObject(json);
                  
                      fs.writeFile("./Temp/config.xml", xml, function(err, data) {
                        if (err) console.log(err);
                  
                        console.log("successfully written our update xml to file");
                        zipper()
                      });
                    });
                  });
            }
            )
            .catch(err => {
                console.error(err);
            });
    }

    //zip downloaded website
    async function zipper(params) {
        let buildFolder = './temp';
        console.log('start zipping');
        
        try {
            await zip(buildFolder, './temp.zip').then(res=>{
                authUser()

            });

        } catch (error) {
         console.log(error);

        }
    }

});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))