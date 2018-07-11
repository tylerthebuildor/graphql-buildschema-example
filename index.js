const server = require('express-graphql');
const { buildSchema } = require('graphql');

// This could also be MongoDB, PostgreSQL, etc
const db = {
  users: [
    {
      organization: '123', // this is a relation by id
      id: 'abc',
      name: 'Elon Musk',
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
    signup(organization, id, name): User
  }
  type Query {
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
  signup({ organization, id, name }) {
    const user = { organization, id, name };
    const match = db.users.find(user => name);
    if (match) throw Error('This username already exists');
    db.users.push(user);
    return new User(user);
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

module.exports = server({
  schema,
  rootValue,
  graphiql: true,
});