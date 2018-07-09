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
  type Query {
    users: [User]
    user(id: String!): User
    organizations: [Organization]
    organization(id: String!): Organization
  }
  type User {
    organization: Organization
    id: String
    name: String
  }
  type Organization {
    users: [User]
    id: String
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
}

const rootValue = {
  users: () => {
    return db.users.map(user => new User(user));
  },
  user: ({ id }) => {
    return new User(db.users.find(user => user.id === id));
  },
  organizations: () => {
    return db
      .organizations
      .map(organization => new Organization(organization));
  },
  organization: ({ id }) => {
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