const server = require('express-graphql');
const { buildSchema } = require('graphql');
const jwt = require('jsonwebtoken');

const jwtSecret = 'makethislongandrandom';

// This could also be MongoDB, PostgreSQL, etc
const db = {
  users: [
    {
      organization: '123', // this is a relation by id
      id: 'abc',
      name: 'Elon Musk',
      password: 'password123',
    }
  ],
  organizations: [
    {
      users: ['abc'], // this is a relation by ids
      id: '123',
      name: 'Space X',
      phone: '555-555-5555',
    }
  ],
};

const schema = buildSchema(`
  type Mutation {
    signup(organization:String, id:String, name:String): User
  }
  type Query {
    login(username:String, password:String): String
    tellMeADadJoke: String
    users: [User]
    user(id: ID!): User
    organizations: [Organization]
    organization(id: ID!): Organization
  }
  type User {
    organization: Organization
    id: ID
    name: String
  }
  type Organization {
    users: [User]
    id: ID
    name: String
    phone: String
  }
`);

class User {
  constructor({ organization, ...rest }) {
    Object.assign(this, rest);
    this.organizationId = organization;
  }

  organization() {
    const organization = db
      .organizations
      .find(({ id }) => id === this.organizationId);

    return new Organization(organization);
  }
}

class Organization {
  constructor({ users, ...rest }) {
    Object.assign(this, rest);
    this.userIds = users;
  }

  users() {
    return db.users
      .filter(({ id }) => this.userIds.includes(id))
      .map(user => new User(user));
  }

  // Replace with above to try out async method
  // async users() {
  //   await new Promise(resolve => setTimeout(resolve, 5000));
  //   return db.users
  //     .filter(({ id })=> this.userIds.includes(id))
  //     .map(user => new User(user));
  // }
}

const rootValue = {
  signup({ organization, id, name, password }) {
    const user = { organization, id, name, password };
    const match = db.users.find(user => user.name === name);
    if (match) throw Error('This username already exists');
    db.users.push(user);
    return new User(user);
  },
  login({ username, password }) {
    const user = db.users.find(user => user.name === username);
    const incorrectPassword = user.password !== password;
    if (!user || incorrectPassword) {
      throw Error('username or password was incorrect');
    }
    const token = jwt.sign({ id: user.id }, jwtSecret);
    return token;
  },
  tellMeADadJoke(data, { user }) {
    if (!user) throw Error('not authorized');
    return 'If you see a robbery at an Apple Store does that make you an iWitness?';
  },
  users() {
    return db.users.map(user => new User(user));
  },
  user({ id }) {
    return new User(db.users.find(user => user.id === id));
  },
  organizations() {
    return db
      .organizations
      .map(organization => new Organization(organization));
  },
  organization({ id }) {
    const organization = db
      .organizations
      .find(organization => organization.id === id);

    return new Organization(organization);
  },
};

module.exports = server(
  attachJwt(jwtSecret)(req => {
    return ({
      schema,
      rootValue,
      graphiql: true,
      context: { user: req.jwt },
    })
  })
);

function attachJwt(secret) {
  return function(fn) {
    return (req, res, next) => {
      const bearerToken = process.env.NODE_ENV === 'production'
        ? req.headers.authorization
        : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFiYyIsImlhdCI6MTUzMjQ1NDE4MH0.U2IXOLpKqcPLCtzIasl_U8cK_I5tDMAW_CPN5szzhwA';

      if (bearerToken) {
        try {
          const token = bearerToken.replace('Bearer ', '');
          req.jwt = jwt.verify(token, secret);
        } catch(error) {
          console.log(error);
        }
      }
  
      return fn(req, res, next)
    }
  }
}
