const { ApolloError } = require('apollo-server')
const { default: axios } = require("axios")
const jwt = require('jsonwebtoken')
const jwkToPem = require('jwk-to-pem')


exports.jwtValidation = async ({req}) => {
    let token =  req.headers.authorization || ""
    if (token === "") throw new ApolloError("No autorizado", "UNAUTHORIZED")
    let decodedToken;
    let hasError = false
    let user = ""
    try {
        let json_file = await axios.get("https://cognito-idp." + process.env.AWS_REGION + ".amazonaws.com/" + process.env.AWS_COGNITO_POOL_ID + "/.well-known/jwks.json")
        for (let i = 0; i < json_file.data.keys.length; i++) {
            hasError = false
            try {
                let pem = jwkToPem(json_file.data.keys[i])
                decodedToken = decodedToken = jwt.verify(token, pem, {
                    algorithms: ['RS256']
                })
                user = decodedToken.username
                i = json_file.data.keys.length
            } catch (e) {
                hasError = true
            }
        }
        if (hasError) throw new ApolloError("Token invalido", "UNAUTHORIZED")
        return {
            username: user
        }
    } catch (e) {
        throw new ApolloError("Hubo un error validando el token", "UNAUTHORIZED", e)
    }
} 