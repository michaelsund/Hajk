// Generic imports – all plugins need these
import React from "react";
import { createPortal } from "react-dom";
import { withStyles } from "@material-ui/core/styles";

// The following imports can be changed, depending on desired appearance of the plugin.
// If you want your plugin to be renderable in Toolbar and as Floating Action Button, you
// need both the List* and Button imports.
// Don't forget to change the icon though!
import { ListItem, ListItemIcon, ListItemText } from "@material-ui/core";
import { Button } from "@material-ui/core";
import BugReportIcon from "@material-ui/icons/BugReport";

// Finally there are some plugin-specific imports. Most plugins will need Model, View and Observer.
// Panel is optional – you could use a Dialog or something else. This Dummy uses a Panel as an
// example though.
import DummyView from "./DummyView";
import DummyModel from "./DummyModel";
import Observer from "react-event-observer";
import Panel from "../../components/Panel.js";

const styles = theme => {
  return {};
};

class Dummy extends React.Component {
  // In native ES6 class we can set state like this, outside the constructor
  state = {
    panelOpen: false
  };

  // Called when plugin's <ListItem> or widget <Button> is clicked
  onClick = e => {
    // Callback that loops through app's panels and calls closePanel() on all except current
    this.app.onPanelOpen(this);

    // This state variable is being watched for in render() and decides whether MUI Component <Drawer> is open or not
    this.setState({
      panelOpen: true
    });
  };

  // Important, part of API for plugins that contain panels.
  closePanel = () => {
    this.setState({
      panelOpen: false
    });
  };

  constructor(spec) {
    super(spec);
    // Important, part of API. Must be a string. Could be fetched from config.
    this.text = "Dummy plugin header";
    this.app = spec.app;

    // Optionally setup an observer to allow sending messages between here and model/view
    this.observer = Observer();
    // Example on how to make observer listen for "myEvent" event sent from elsewhere
    this.observer.subscribe("myEvent", message => {
      console.log(
        "myEvent in Dummy plugin fired with following message:",
        message
      );
    });

    // Initiate a model. Although optional, will probably be used for all except the most simple plugins.
    this.dummyModel = new DummyModel({
      map: spec.map,
      app: spec.app,
      observer: this.observer
    });

    // Important, part of API for plugins that contain panels. Makes App aware of this panels existance.
    this.app.registerPanel(this);
  }

  // Important, part of API. Avoid re-rendering if current panel has not changed its state.
  shouldComponentUpdate(nextProps, nextState) {
    return this.state.panelOpen !== nextState.panelOpen;
  }

  // Important, part of API. Make sure to respect panel visibility set in config.
  componentWillMount() {
    this.setState({
      panelOpen: this.props.options.visibleAtStart
    });
  }

  // Not part of API but rather convention. If plugin has a panel, its render method should be called renderPanel().
  renderPanel() {
    // Using Portals (see React docs) we render panel not in direct relation in DOM to the button, but rather in #map-overlay <div>.
    // We make use of <Panel>, a component that encapsulates MUI's Drawer, that we've written to reuse across Hajk's plugins.
    return createPortal(
      <Panel
        title={this.text}
        onClose={this.closePanel}
        position="left"
        open={this.state.panelOpen}
      >
        {/* Note that normally you don't need to give View access to BOTH observer and model – one of those is sufficient */}
        <DummyView
          app={this.app}
          map={this.map}
          parent={this}
          observer={this.observer}
          model={this.dummyModel}
        />
      </Panel>,
      document.getElementById("map-overlay")
    );
  }

  /* 
   * Important, part of plugins API.
   * Each plugin must present both renderAsWidgetItem and renderAsToolbarItem.
   * Depending on user's preferred location, App will render the plugin
   * using one of these two methods.
  */

  // Render as a FAB (floating action button, https://material-ui.com/demos/buttons/#floating-action-buttons)
  renderAsWidgetItem() {
    const { classes } = this.props;
    return (
      <div>
        <Button
          variant="fab"
          color="default"
          aria-label="Dummy plugin"
          className={classes.button}
          onClick={this.onClick}
        >
          <EditIcon />
        </Button>
        {this.renderPanel()}
      </div>
    );
  }

  // Render as a toolbar item, https://material-ui.com/demos/lists/
  renderAsToolbarItem() {
    return (
      <div>
        <ListItem
          button
          divider={true}
          selected={this.state.panelOpen}
          onClick={this.onClick}
        >
          <ListItemIcon>
            <BugReportIcon />
          </ListItemIcon>
          <ListItemText primary={this.text} />
        </ListItem>
        {this.renderPanel()}
      </div>
    );
  }

  render() {
    if (this.props.type === "toolbarItem") {
      return this.renderAsToolbarItem();
    }

    if (this.props.type === "widgetItem") {
      return this.renderAsWidgetItem();
    }

    return null;
  }
}

export default withStyles(styles)(Dummy);
