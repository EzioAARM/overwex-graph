const { ApolloServer, gql, ApolloError } = require("apollo-server")
const { findUser } = require("./searchResult")
const { GetApexUser } = require("./getUser")
const { default: axios } = require("axios")
const jwt = require('jsonwebtoken')
const jwkToPem = require('jwk-to-pem')

const typeDefs = gql`
type Query {
    SearchResultApexUsers (username: String) : [ SearchApexUser ],
    ApexUserProfile (username: String!, platform: String!) : ApexUser
}
type SearchApexUser {
    username: String!,
    platform: String!,
    imageUrl: String
}
type ApexUser {
    username: String!,
    platform: String!,
    imageUrl: String,
    kills: Int,
    level: Int,
    legends: [ ApexLegends ],
    rankHistory: [ UserRankHistory ]
}
type ApexLegends {
    name: String!,
    imageUrl: String,
    tallImageUrl: String,
    bgImageUrl: String,
    kills: Int,
    isSelected: Boolean
}
type UserRankHistory {
    rankName: String!,
    rankValue: Int,
    rankIconUrl: String,
    fechaRegistrado: String,
    fechaUnix: String
}`

const resolvers = {
    Query: {
        SearchResultApexUsers: findUser,
        ApexUserProfile: GetApexUser
    }
}

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({req}) => {
        let token =  req.headers.authorization || ""
        if (token === "") throw new ApolloError("No autorizado", "UNAUTHORIZED")
        let cognitoUrl = "https://cognito-idp." + process.env.AWS_REGION + ".amazonaws.com/" + process.env.AWS_COGNITO_POOL_ID + "/.well-known/jwks.json"
        let decodedToken;
        let hasError = false
        let user = ""
        try {
            let json_file = await axios.get(cognitoUrl)
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
            throw new ApolloError("Token invalido", "UNAUTHORIZED", e)
        }
    } 
})

server.listen().then(({url}) => {
    console.log(`GraphQL running at ${url}`)
})