const { findUser } = require("./searchResult")
const { GetApexUser } = require("./getUser")

module.exports = {
    Query: {
        SearchResultApexUsers: findUser,
        ApexUserProfile: GetApexUser
    }
}