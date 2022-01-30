const express = require('express');
const mongoose = require('mongoose');

const app = express();
const cors = require('cors');
require('dotenv').config();
const {Schema}= mongoose;
// schema for the usera and exercises
const exerciseSchema = new Schema({
  username: {
      type: String,
      required: true
  },
  description: {
      type: String,
      required: true
  },
  duration: {
      type: Number,
      required: true
  },
  date: {
      type: Date,
      default: Date.now()
  }
});
const userSchema = new Schema({
  username: {
      type: String,
      required: true
  }
});
const User= mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);
app.use(express.json());
app.use(express.urlencoded( {extended: true} ));

mongoose.connect(process.env.MONGO_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true
});

app.use(cors());

app.use(express.static('public'));

// request informations
app.use((req, res, next) => {
  console.log("method: " + req.method + "  |  path: " + req.path + "  |  IP - " + req.ip);
  next();
});


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

//for new users and list of users
app.route('/api/users').get((req, res) => {
  User.find({}, (error, data) => {
    
    res.json(data);
  });
}).post((req, res) => {
  const potentialUsername = req.body.username;

  User.findOne({username: potentialUsername}, (error, data) => {
    if (error) {
      res.send("Unknown userID");
      return console.log(error);
    }

    if (!data) { 
      const newUser = new User({
        username: potentialUsername
      });

      newUser.save((error, data) => {
        if (error) return console.log(error);
        const reducedData = {
          "username": data.username, 
          "_id": data._id
        };
        res.json(reducedData);
      });
    } else { 
      res.send(`Username  already exists.`);
    }
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const userID = req.body[":_id"] || req.params._id;
  const descriptionEntered = req.body.description;
  const durationEntered = req.body.duration;
  const dateEntered = req.body.date;


  if (!userID) {
    res.json("Path `userID` is required.");
    return;
  }
  if (!descriptionEntered) {
    res.json("Path `description` is required.");
    return;
  }
  if (!durationEntered) {
    res.json("Path `duration` is required.");
    return;
  }

  User.findOne({"_id": userID}, (error, data) => {
    if (error) {
      res.json("Invalid userID");
      return console.log(error);
    }
    if (!data) {
      res.json("Unknown userID");
      return;
    } else {
     
      const unamematch = data.username;
      
      // Create an Exercise object
      const newExercise = new Exercise({
        username: unamematch,
        description: descriptionEntered,
        duration: durationEntered
      });

      // Set the date of the Exercise object if the date was entered
      if (dateEntered) {
        newExercise.date = dateEntered;
      }

      // Save the exercise
      newExercise.save((error, data) => {
        if (error) return console.log(error);

        

        // Create JSON object to be sent to the response
        const exerciseObject = {
          "_id": userID,
          "username": data.username,
          "date": data.date.toDateString(),
          "duration": data.duration,
          "description": data.description
        };

        // Send JSON object to the response
        res.json(exerciseObject);

      });
    }
  });
});


// PATH /api/users/:_id/logs?[from][&to][&limit]
app.get('/api/users/:_id/logs', (req, res) => {
  const id = req.body["_id"] || req.params._id;
  var fromDate = req.query.from;
  var toDate = req.query.to;
  var limit = req.query.limit;



  // Validate the query parameters
  if (fromDate) {
    fromDate = new Date(fromDate);
    if (fromDate == "Invalid Date") {
      res.json("Invalid Date Entered");
      return;
    }
  }

  if (toDate) {
    toDate = new Date(toDate);
    if (toDate == "Invalid Date") {
      res.json("Invalid Date Entered");
      return;
    }
  }

  if (limit) {
    limit = new Number(limit);
    if (isNaN(limit)) {
      res.json("Invalid Limit Entered");
      return;
    }
  }

  User.findOne({ "_id" : id }, (error, data) => {
    if (error) {
      res.json("Invalid UserID");
      return console.log(error);
    }
    if (!data) {
      res.json("Invalid UserID");
    } else {

      const unamefound = data.username;
      var returnobj = { "_id" : id, "username" : unamefound };

      var findFilter = { "username" : unamefound };
      var dfilter = {};

      if (fromDate) {
        returnobj["from"] = fromDate.toDateString();
        dfilter["$gte"] = fromDate;
        if (toDate) {
          returnobj["to"] = toDate.toDateString();
          dfilter["$lt"] = toDate;
        } else {
          dfilter["$lt"] = Date.now();
        }
      }

      if (toDate) {
        returnobj["to"] = toDate.toDateString();
        dfilter["$lt"] = toDate;
        dfilter["$gte"] = new Date("1960-01-01");
      }

      if (toDate || fromDate) {
        findFilter.date = dfilter;
      }


      Exercise.count(findFilter, (error, data) => {
        if (error) {
          res.json("Invalid Date Entered");
          return console.log(error);
        }
        var count = data;
        if (limit && limit < count) {
          count = limit;
        }
        returnobj["count"] = count;


        Exercise.find(findFilter, (error, data) => {
          if (error) return console.log(error);


          var logArray = [];
          var objsubset = {};
          var count = 0;

          data.forEach(function(val) {
            count += 1;
            if (!limit || count <= limit) {
              objsubset = {};
              objsubset.description = val.description;
              objsubset.duration = val.duration;
              objsubset.date = val.date.toDateString();
              console.log(objsubset);
              logArray.push(objsubset);
            }
          });

          returnobj["log"] = logArray;

          res.json(returnobj);
        });

      });

    }
  });
});

// Listen on the proper port to connect to the server 
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
})
