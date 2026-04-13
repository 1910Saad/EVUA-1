import React, { Component } from 'react';
import PropTypes from 'prop-types';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: 'Guest',
      data: null
    };
  }

  componentDidMount() {
    console.log("Component is about to mount");
    this.fetchData();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.user !== this.props.user) {
      this.setState({ username: nextProps.user });
    }
  }

  fetchData() {
    const self = this;
    setTimeout(function() {
      self.setState({ data: "Loaded data for " + self.state.username + "!" });
    }, 1000);
  }

  render() {
    const greeting = "Hello, " + this.state.username + "!";
    
    return (
      <div className="app-container">
        <h1>{greeting}</h1>
        {this.state.data ? (
          <p>{this.state.data}</p>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    );
  }
}

App.propTypes = {
  user: PropTypes.string
};

export default App;
