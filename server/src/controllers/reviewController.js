import Joi from 'joi';
import Review from '../models/Review.js';

// Validation schema for creating a review
const createReviewSchema = Joi.object({
  courseCode: Joi.string().required(),

  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required(),

  comment: Joi.string().optional(),

  reviewedBy: Joi.string()
    .hex()
    .length(24)
    .optional(),
});

// Validation schema for updating a review
const updateReviewSchema = Joi.object({
  courseCode: Joi.string().optional(),

  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .optional(),

  comment: Joi.string().optional(),

  reviewedBy: Joi.string()
    .hex()
    .length(24)
    .optional(),
}).min(1);

// GET /api/reviews
export async function getAllReviews(req, res, next) {
  try {
    const reviews = await Review.find()
      .populate('reviewedBy', 'name email');

    res.status(200).json(reviews);
  } catch (err) {
    next(err);
  }
}

// GET /api/reviews/:id
export async function getReview(req, res, next) {
  try {
    const review = await Review.findById(req.params.id)
      .populate('reviewedBy', 'name email');

    if (!review) {
      return res.status(404).json({
        message: 'Review not found',
      });
    }

    res.status(200).json(review);
  } catch (err) {
    next(err);
  }
}

// GET /api/reviews/summary?courseCode=CS101
export async function getCourseSummary(req, res, next) {
  try {
    const { courseCode } = req.query;

    if (!courseCode) {
      return res.status(400).json({
        message: 'courseCode is required',
      });
    }

    const result = await Review.aggregate([
      {
        $match: {
          courseCode: courseCode,
        },
      },
      {
        $group: {
          _id: '$courseCode',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    if (result.length === 0) {
      return res.status(200).json({
        courseCode,
        averageRating: null,
        reviewCount: 0,
      });
    }

    res.status(200).json({
      courseCode,
      averageRating: result[0].averageRating,
      reviewCount: result[0].reviewCount,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/reviews
export async function createReview(req, res, next) {
  try {
    const { error, value } = createReviewSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    const review = await Review.create(value);

    res.status(201).json(review);
  } catch (err) {
    // MongoDB duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({
        message: 'This user has already reviewed this course',
      });
    }

    next(err);
  }
}

// PATCH /api/reviews/:id
export async function updateReview(req, res, next) {
  try {
    const { error, value } = updateReviewSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      value,
      {
        new: true,
        runValidators: true,
      }
    ).populate('reviewedBy', 'name email');

    if (!review) {
      return res.status(404).json({
        message: 'Review not found',
      });
    }

    res.status(200).json(review);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: 'This user has already reviewed this course',
      });
    }

    next(err);
  }
}

// DELETE /api/reviews/:id
export async function deleteReview(req, res, next) {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);

    if (!review) {
      return res.status(404).json({
        message: 'Review not found',
      });
    }

    res.status(200).json({
      message: 'Review deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}