const Listing = require('../models/listing');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding'); // requiring service
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken }); // starting required service

module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render('listings/index.ejs', { allListings });
};

module.exports.renderNewForm = (req, res) => {
  res.render('listings/new.ejs');
};

module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({
      path: 'reviews',
      populate: {
        path: 'author',
      },
    })
    .populate('owner'); // use populate to show whole data
  if (!listing) {
    req.flash('error', 'Listing Does not exists!');
    return res.redirect('/listings');
  }
  //console.log(listing);
  res.render('listings/show.ejs', { listing });
};

module.exports.createListing = async (req, res) => {
  let response = await geocodingClient
    .forwardGeocode({
      query: req.body.listing.location,
      limit: 1, // limit denotes how many coordinates we will get
    })
    .send();

  let url = req.file.path;
  let filename = req.file.filename;

  //let {title, descriptioin, image, price, country, location} = req.body;

  let listing = req.body.listing; // basically we have created listing object in html form and that object contains all the name stated in form
  // this listing is an object, we can directly pass it to create document in DB

  const newListing = new Listing(listing);
  newListing.owner = req.user._id; ////////

  newListing.image = { url, filename };

  newListing.geometry = response.body.features[0].geometry;

  let savedListing = await newListing.save();
  console.log(savedListing);

  req.flash('success', 'New Listing Added!');
  res.redirect('/listings');
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash('error', 'Listing Does not exists!');
    return res.redirect('/listings');
  }

  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace('/upload', '/upload/w_250');

  res.render('listings/edit.ejs', { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
  let { id } = req.params;

  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing }); // de-constructuring the object 'req.body.lsiting' which contains all the key : value of req.body
  // listing do not have image data as we are uploading it so it will not store in req.body

  if (typeof req.file !== 'undefined') {
    let url = req.file.path;
    let filename = req.file.filename;

    listing.image = { url, filename };
    await listing.save(); // we have to save again
  }

  req.flash('success', 'Listing Updated!');
  res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash('success', 'Listing Deleted!');
  res.redirect('/listings');
};
