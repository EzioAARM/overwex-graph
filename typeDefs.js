const { gql } = require('apollo-server')

module.exports = gql`
"""
Listado de comandos que se pueden enviar a la API
"""
type Query {
    "Busca en los jugadores de Apex un usuario que coincida con el parametro enviado en username"
    SearchResultApexUsers (
        "Nombre de usuario que se desea buscar (no debe ser exacto)"
        username: String
    ) : [ SearchApexUser ],
    "Obtiene la informacion de un jugador de Apex"
    ApexUserProfile (
        "Nombre del usuario"
        username: String!, 
        "Plataforma en la que juega el usuario (origin, ps4, xbl)"
        platform: String!
    ) : ApexUser
}
"""
Tipo para la busqueda de usuarios
"""
type SearchApexUser {
    "Nombre de usuario encontrado"
    username: String!,
    "Plataforma en la que juega el usuario (origin, ps4, xbl)"
    platform: String!,
    "URL de la imagen de perfil del usuario"
    imageUrl: String
}
"""
Tipo para la informacion del usuario
"""
type ApexUser {
    "Nombre de usuario del jugador"
    username: String!,
    "Plataforma en la que juega el usuario (origin, ps4, xbl)"
    platform: String!,
    "URL de la imagen de perfil del usuario"
    imageUrl: String,
    "Total de eliminaciones del jugador (puede no tomar todas las leyendas)"
    kills: Int,
    "Nivel del jugador en el juego"
    level: Int,
    "Listado de leyendas con su informacion"
    legends: [ ApexLegends ],
    "Historial de partidas competitivas (se toma desde la primera busqueda de la aplicacion)"
    rankHistory: [ UserRankHistory ]
}
"""
Leyenda de Apex
"""
type ApexLegends {
    "Nombre de la leyenda"
    name: String!,
    "Imagen principal de la leyenda"
    imageUrl: String,
    "Imagen alta de la leyenda"
    tallImageUrl: String,
    "Imagen de fondo para la leyenda"
    bgImageUrl: String,
    "Eliminaciones del jugador con la leyenda"
    kills: Int,
    "Indica si la leyenda esta seleccionada en el loby del juego"
    isSelected: Boolean
}
"""
Historial de competitivas para un usuario
"""
type UserRankHistory {
    "Nombre del rango"
    rankName: String!,
    "Puntos de ranked del usuario"
    rankValue: Int,
    "URL del icono del rango"
    rankIconUrl: String,
    "Fecha en la que se registro el rango del usuario"
    fechaRegistrado: String,
    "Fecha en formato unix en la que se registro el rango del usuario"
    fechaUnix: String
}`