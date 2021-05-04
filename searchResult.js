const { ApolloError } = require("apollo-server")
const { default: axios } = require("axios")
require('dotenv').config()

exports.findUser = async (obj, args, context, info) => {
    if (!context.username) throw new ApolloError("No autorizado", "UNAUTHORIZED")
    if (!args.username) throw new ApolloError("El nombre de usuario es requerido", "FIELD_REQUIRED")
    let userResult = []
    let username = args.username
    let platforms = [
        "origin",
        "psn",
        "xbl"
    ]
    for (i = 0; i < platforms.length; i++) {
        try {
            const resultData = await axios.get(
                "https://public-api.tracker.gg/v2/apex/standard/search?platform=" + platforms[i] + "&query=" + username + "&autocomplete=true", {
                    headers: {
                        "TRN-Api-Key": process.env.TRACKER_HEADERS
                    }
                }
            )
            resultData.data.data.forEach((item, index) => {
                userResult.push({
                    username: item.platformUserIdentifier,
                    platform: item.platformSlug,
                    imageUrl: item.avatarUrl
                })
            })
        }
        catch (e) {
            console.log("No se encontro al usuario " + username + " en " + platforms[i])
        }
    }
    return userResult
}