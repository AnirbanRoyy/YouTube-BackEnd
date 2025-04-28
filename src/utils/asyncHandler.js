const asyncHandler = (fn) => {
    return async (req, res, next) => {
        try {
            await Promise.resolve(fn(req, res, next));
        } catch (error) {
            next(error); // Pass the error to the next middleware
        }
    };
};

export { asyncHandler };
