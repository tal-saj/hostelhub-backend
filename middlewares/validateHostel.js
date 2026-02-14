const Joi = require('joi');

const hostelSchema = Joi.object({
  hostelName: Joi.string().required().min(3).max(100),
  hostelAddress: Joi.string().required().min(10).max(500),
  hostelCity: Joi.string().required().min(3).max(50),
  hostelCategory: Joi.string().valid('boys', 'girls', 'apartment').required(),
  hostelPrice: Joi.number().required().min(0).max(1000000),
  amenities: Joi.string().optional()
});

module.exports = (req, res, next) => {
  const { error } = hostelSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message.replace(/"/g, '')
    });
  }
  next();
};