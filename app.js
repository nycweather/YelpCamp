const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const CampGround = require('./models/campground');
const methodOverride = require('method-override');
const app = express();
const ejsMate = require('ejs-mate');
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');
const { campgroundSchema, reviewSchema } = require('./validateSchemas')
const Review = require('./models/reviews');

mongoose.set('strictQuery', true);
mongoose.connect('mongodb://127.0.0.1:27017/yelp-camp', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("MONGO CONNECTION OPEN!!!")
    })
    .catch(err => {
        console.log("Error, MONGO CONNECTION!!!!")
        console.log(err)
    });

const db = mongoose.connection;

// Add error handling for the db connection
db.on("error", function (error) {
    console.log("Database connection error:", error);
});

db.once("open", () => {
    console.log("Database Connected")
});

//app.engine('html', require('ejs').renderFile);
app.engine('ejs', ejsMate)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

const validateCampground = (req, res, next) => {

    const { error } = campgroundSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message, 400);
        throw new ExpressError(msg, 400);
    } else {
        next();
    }
}

const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message, 400);
        throw new ExpressError(msg, 400);
    } else {
        next();
    }
}

app.get('/', (req, res) => {
    res.render('home')
});

app.get('/campgrounds', catchAsync(async (req, res) => {
    const campgrounds = await CampGround.find({});
    res.render('campgrounds/index', { campgrounds })
}))

app.get('/campgrounds/new', (req, res) => {
    res.render('campgrounds/new')
})

app.post('/campgrounds', validateCampground, catchAsync(async (req, res, next) => {
    //if (!req.body.campground) throw new ExpressError('Invalid Campground Data', 400);
    const campground = new CampGround(req.body.campground);
    await campground.save();
    res.redirect(`campgrounds/${campground._id}`);
}))


app.get('/campgrounds/:id', catchAsync(async (req, res) => {
    const campground = await CampGround.findById(req.params.id).populate('reviews');
    res.render('campgrounds/show', { campground })
}))
app.get('/campgrounds/:id/edit', catchAsync(async (req, res) => {
    const campground = await CampGround.findById(req.params.id);
    res.render('campgrounds/edit', { campground })
}))

app.put('/campgrounds/:id', validateCampground, catchAsync(async (req, res) => {
    const { id } = req.params;
    const campground = await CampGround.findByIdAndUpdate(id, { ...req.body.campground });
    res.redirect(`/campgrounds/${campground._id}`)

}))

app.delete('/campgrounds/:id', catchAsync(async (req, res) => {
    const { id } = req.params;
    await CampGround.findByIdAndDelete(id);
    res.redirect('/campgrounds')
}))

app.post('/campgrounds/:id/reviews', validateReview, catchAsync(async (req, res) => {
    const campground = await CampGround.findById(req.params.id);
    const review = new Review(req.body.review);
    campground.reviews.push(review);
    await review.save();
    await campground.save();
    res.redirect(`/campgrounds/${campground._id}`);
}))

app.delete('/campgrounds/:id/reviews/:reviewId', catchAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    await CampGround.findByIdAndUpdate(id, { $pull: { reviews: reviewId } })
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/campgrounds/${id}`);
}))

app.all('*', (req, res, next) => {
    next(new ExpressError('Page not found', 404))
})
app.use((err, req, res, next) => {
    const { status = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(status).render('errors', { err });
})

app.listen(3000, () => {
    console.log('Listening on port 3000')
});
