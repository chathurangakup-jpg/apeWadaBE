const {
  listCategories,
  createCategory,
  updateCategory,
} = require("../services/admin.services");
const {
  validateCategoryId,
  validateCategoryPayload,
} = require("../validators/admin.validator");

const getCategories = async (req, res) => {
  try {
    const categories = await listCategories();
    return res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    console.error("List categories error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load categories",
    });
  }
};

const postCategory = async (req, res) => {
  try {
    const payload = validateCategoryPayload(req.body);
    const category = await createCategory(payload);
    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: { category },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A category with this English name or slug already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    console.error("Create category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

const patchCategory = async (req, res) => {
  try {
    const id = validateCategoryId(req.params.id);
    const payload = validateCategoryPayload(req.body, true);
    const category = await updateCategory(id, payload);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: { category },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A category with this English name or slug already exists",
      });
    }

    if (error.message === "INVALID_CATEGORY_ID") {
      return res.status(400).json({
        success: false,
        message: "A valid category ID is required",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    console.error("Update category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};

module.exports = { getCategories, postCategory, patchCategory };
