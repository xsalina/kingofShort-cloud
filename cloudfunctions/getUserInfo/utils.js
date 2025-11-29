function successResponse({data = {}, message = "ok", code = 0}) {
  return { success: true, code, message, data }
}

function failResponse({message = "error", code = 1, data = null}) {
  return { success: false, code, message, data }
}

module.exports = { successResponse, failResponse }
