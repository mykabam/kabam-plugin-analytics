exports.modelFactory = function(mongoose, config) {

  var totalSchema = mongoose.Schema({
    site: String,
    timestamp: Date,
    hits: Number,
    browser: {
      Firefox: Number,
      Chrome: Number
    },
    os: {
      Linux: Number
    },
    platform: {
      Linux: Number
    },
    userid: {
      anonymous: Number
    },
    ipAddresses: [{
      ip: String,
      hits: Number
    }],
    pages: [{
      page: String,
      hits: Number
    }]
  });

  totalSchema.index({ site: 1 });

  return mongoose.model('Total', totalSchema);
};
