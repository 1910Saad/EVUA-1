var fs = require('fs');
var path = require('path');
var request = require('request');

function processData(fileName, callback) {
  var fullPath = path.join(__dirname, fileName);
  
  fs.exists(fullPath, function(exists) {
    if (exists) {
      fs.readFile(fullPath, 'utf8', function(err, data) {
        if (err) {
          callback(err);
        } else {
          // Callback hell pattern
          request('https://api.example.com/process?data=' + data, function(error, response, body) {
            if (error) {
              callback(error);
            } else {
              callback(null, "Successfully processed: " + body);
            }
          });
        }
      });
    } else {
      callback(new Error("File not found"));
    }
  });
}

module.exports = {
  processData: processData
};
