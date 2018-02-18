var http = require('http');
var path = require('path');
var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var session = require('express-session');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

var app = express();

app.set('views', path.resolve(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger("dev"));

app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser());
app.use(session({
    secret:"secretSession",
    resave:true,
    saveUninitialized:true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done){
    done(null, user);
});

passport.deserializeUser(function(user, done){
    done(null, user);
});

LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy({
    userNameField:'',
    passwordField:''
},

function(username, password, done){
    MongoClient.connect(url, function(err, db){
        if(err) throw err;

        var dbObj = db.db("users");

        dbObj.collection("users").findOne({username:username}, function(err, results){
            if(results.password === password){
                var user = results;
                done(null, user);
            }
            else {
                done(null, false, {message:"Bad Password"});
            }
        });
    });
}));

function ensureAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        next();
    }
    else {
        res.redirect("/sign-in");
    }
}

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/sign-in")
});

app.get("/", ensureAuthenticated, function(req, res){
    MongoClient.connect(url, function(err, db){
        if(err) throw err;
        var dbObj = db.db("items");

        dbObj.collection("items").find().toArray(function(err, results){
            console.log("Site served");
            db.close();
            res.render("index", {items:results});
        });
    });
});

app.get("/new-entry", ensureAuthenticated,function(req, res){
    res.render("new-entry");
});

app.get("/sign-in", function(req, res){
    res.render("sign-in");
});

app.get("/sign-up", function(req, res){
    res.render("sign-up");
});

app.post("/new-entry", function(req, res){
    if(!req.body.title){
        res.status(400).send("Entries must have valid text");
        return;
    }
    
    MongoClient.connect(url, function(err, db){
        if(err) throw err;

        var dbObj = db.db("items");

        dbObj.collection("items").save(req.body, function(err, result){
            console.log("Data saved");
            db.close();
            res.redirect("/");
        });
    });
});

app.post("/sign-up", function(req, res){
    console.log(req.body);

    MongoClient.connect(url, function(err, db){
        if(err) throw err;

        var dbObj = db.db("users");
        
        var user = {
            username: req.body.username,
            password: req.body.password
        }
        
        dbObj.collection("users").insert(user, function(err, results){
            if(err) throw err;

            req.login(req.body, function(){
                res.redirect('/sign-in');
            });
        });
    });
});

app.post("/sign-in", passport.authenticate('local', {
        failureRedirect:'/sign-in'
    }),

    function(req, res){
        res.redirect("/");
    }
);

app.use(function(req, res){
    res.status(404).render("404");
});

http.createServer(app).listen(3000, function(){
    console.log("List site server started on port 3000");
});