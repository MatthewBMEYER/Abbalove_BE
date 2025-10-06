function success(code, message, data = null) {
    return {
        success: true,
        code,
        message,
        data,
    };
}

function error(code, message, errors = null) {
    return {
        success: false,
        code,
        message,
        errors,
    };
}

module.exports = { success, error };
