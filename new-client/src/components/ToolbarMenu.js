import React from "react";
import Button from "@material-ui/core/Button";
import ClearIcon from "@material-ui/icons/LayersClear";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import IconButton from "@material-ui/core/IconButton";
import { withStyles } from "@material-ui/core/styles";

const styles = theme => {
  return {
    toolbarMenu: {
      display: "flex",
      alignItems: "center"
    },
    toolbarMenuButton: {
      display: "none",
      [theme.breakpoints.down("xs")]: {
        display: "block"
      }
    },
    icon: {
      color: "black",
      padding: "3px",
      overflow: "visible"
    },
    toolbarMenuItems: {
      display: "flex",
      [theme.breakpoints.down("xs")]: {
        position: "absolute",
        top: "48px",
        background: "white",
        padding: "10px",
        minWidth: "80px",
        border: "1px solid #ccc",
        boxShadow: "2px 2px 2px rgba(0, 0, 0, 0.18)",
        borderRadius: "4px",
        right: 0
      }
    }
  };
};
class ToolbarMenu extends React.Component {
  constructor() {
    super();
    this.state = {
      menuVisible: window.innerWidth > 600
    };
    window.addEventListener("resize", () => {
      this.setState({
        menuVisible: window.innerWidth > 600
      });
    });
  }

  renderSearchPlugin() {
    const { classes, appModel } = this.props;
    const searchPlugin = appModel.plugins.search;
    if (searchPlugin) {
      return (
        <div className={classes.searchWidget}>
          <searchPlugin.component
            map={searchPlugin.map}
            app={searchPlugin.app}
            options={searchPlugin.options}
          />
        </div>
      );
    } else {
      return null;
    }
  }

  render() {
    const { classes } = this.props;
    return (
      <div className={classes.toolbarMenu}>
        {this.renderSearchPlugin()}
        <div
          className={classes.toolbarMenuButton}
          onClick={() => {
            this.setState({
              menuVisible: !this.state.menuVisible
            });
          }}
        >
          <IconButton className={classes.icon}>
            <MoreVertIcon />
          </IconButton>
        </div>
        <div
          className={classes.toolbarMenuItems}
          style={{
            display: this.state.menuVisible
              ? window.innerWidth < 600
                ? "block"
                : "flex"
              : "none"
          }}
        >
          <div>
            <Button
              aria-label="Rensa"
              onClick={e => {
                this.props.appModel.clear();
              }}
            >
              <ClearIcon className={classes.icon} />
              Rensa kartan
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(ToolbarMenu);
