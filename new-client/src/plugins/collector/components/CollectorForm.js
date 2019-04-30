import React, { Component } from "react";
import { createPortal } from "react-dom";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";
import { withStyles } from "@material-ui/core/styles";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import Snackbar from "@material-ui/core/Snackbar";
import PlaceIcon from "@material-ui/icons/Place";
import FlareIcon from "@material-ui/icons/Flare";
import LocalFloristIcon from "@material-ui/icons/LocalFlorist";
import Typography from "@material-ui/core/Typography/Typography";
import { isMobile } from "../../../utils/IsMobile";

const styles = theme => {
  return {
    text: {
      width: "100%"
    },
    form: {},
    cross: {
      position: "fixed",
      left: "50%",
      top: "50%",
      color: theme.palette.primary.main,
      textShadow: "2px 2px rgba(0, 0, 0, 0.5)",
      userSelect: "none",
      pointerEvents: "none",
      "& i": {
        fontSize: "50px",
        marginLeft: "-27px",
        marginTop: "9px"
      }
    },
    crossButton: {
      marginTop: "10px",
      marginLeft: "-31px",
      pointerEvents: "all"
    },
    saveError: {
      color: "red",
      background: "rgb(255, 200, 200)",
      marginTop: "15px",
      borderRadius: "5px",
      padding: "5px"
    },
    padded: {
      padding: "20px 0"
    },
    button: {
      justifyContent: "left"
    },
    buttonIcon: {
      marginRight: "5px"
    },
    placeIconMap: {
      fontSize: "64px",
      position: "relative",
      right: "32px",
      bottom: "28px"
    },
    localFloristIcon: {
      color: "green",
      fontSize: "64px"
    },
    thank: {
      fontSize: "2.8rem",
      fontWeight: "500"
    },
    thankForm: {
      textAlign: "center"
    },
    anchorOriginBottomCenter: {
      bottom: "60px",
      [theme.breakpoints.up("xs")]: {
        left: "50%",
        right: "auto",
        transform: "translateX(-50%)",
        borderRadius: "4px",
        overflow: "hidden",
        minWidth: "391px"
      },
      [theme.breakpoints.down("xs")]: {
        width: "100%",
        minWidth: "inherit",
        borderRadius: "0"
      }
    },
    formControl: {
      minWidth: 120
    }
  };
};

const saveErrorText = "Fel - din kommentar gick inte att spara.";
const validationErrorText = " - detta fält krävs";
class CollectorForm extends Component {
  state = {
    comment: "",
    saveError: "",
    validationError: "",
    displayPlace: false
  };

  constructor(props) {
    super();
    props.model.observer.on("abort", () => {
      this.abort();
    });
  }

  renderPlaceForm = () => {
    this.setState({
      mode: "place",
      displayPlace: false,
      placemarkVisible: true
    });
    if (window.document.body.clientWidth < 600) {
      this.props.localObserver.emit("minimizeWindow", true);
    }
  };

  renderGenericForm = () => {
    this.setState({
      mode: "generic",
      displayPlace: false
    });
  };

  renderSuccessForm = () => {
    this.setState({
      mode: "success"
    });
  };

  saveError = text => {
    this.setState({
      saveError: text || saveErrorText
    });
  };

  reset = () => {
    const { form } = this.props;

    const formFieldNames = form.reduce((reducer, field) => {
      reducer[field.name] = "";
      return reducer;
    }, {});

    this.setState({
      comment: "",
      saveError: "",
      validationError: "",
      mode: "start",
      ...formFieldNames
    });
  };

  save = generic => () => {
    if (this.state.comment) {
      this.props.model.save(
        {
          comment: this.state.comment,
          displayPlace: this.state.displayPlace,
          generic: generic
        },
        transactionResult => {
          if (
            transactionResult &&
            transactionResult.transactionSummary &&
            transactionResult.transactionSummary.totalInserted
          ) {
            if (transactionResult.transactionSummary.totalInserted > 0) {
              this.setState({
                comment: "",
                saveError: "",
                validationError: "",
                mode: "success"
              });
            } else {
              this.saveError();
            }
          } else {
            this.saveError();
          }
        },
        error => {
          this.saveError(error);
        }
      );
    } else {
      this.setState({
        validationError: validationErrorText
      });
    }
  };

  abort = () => {
    this.reset();
    this.props.onClose();
  };

  stringify() {
    const { form } = this.props;
    return JSON.stringify(
      form.reduce((reducer, field) => {
        reducer[field.name] = this.state[field.name];
        return reducer;
      }, {})
    );
  }

  handleChange = name => event => {
    this.setState({
      [name]: event.target.value,
      comment: this.stringify()
    });
  };

  renderSaveError() {
    const { classes } = this.props;
    return this.state.saveError ? (
      <div className={classes.saveError}>{this.state.saveError}</div>
    ) : null;
  }

  renderSuccess() {
    const { classes } = this.props;
    //<LocalFloristIcon className={classes.localFloristIcon} />
    return (
      <div className={classes.form}>
        <div className={classes.thankForm}>
          <Typography variant="h2" className={classes.thank}>
            TACK
          </Typography>
          <Typography>för din synpunkt!</Typography>
          <div>
            <Button color="primary" onClick={this.abort}>
              Stäng
            </Button>
          </div>
        </div>
      </div>
    );
  }

  renderStart() {
    const { classes } = this.props;
    return (
      <div className={classes.form}>
        <div>
          <h2>Vi vill veta vad du tycker!</h2>
        </div>
        <div>
          <div className={classes.padded}>
            <div>
              <Button
                color="primary"
                variant="contained"
                onClick={this.renderPlaceForm}
                className={classes.button}
              >
                <PlaceIcon className={classes.buttonIcon} />
                Tyck till om en plats
              </Button>
            </div>
            <br />
            <div>
              <Button
                color="primary"
                variant="contained"
                onClick={this.renderGenericForm}
                className={classes.button}
              >
                <FlareIcon className={classes.buttonIcon} />
                Lämna en generell synpunkt
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderOkButton() {
    const { classes } = this.props;
    if (document.body.clientWidth < 600) {
      return (
        <Button
          className={classes.crossButton}
          variant="contained"
          color="primary"
          onClick={() => {
            this.props.localObserver.emit("maximizeWindow", true);
            this.setState({
              placemarkVisible: false
            });
          }}
        >
          ok
        </Button>
      );
    } else {
      return null;
    }
  }

  renderGeneric() {
    const { classes } = this.props;
    return (
      <div className={classes.form}>
        <div>Skriv din synpunkt nedan</div>
        <TextField
          rows="10"
          multiline={true}
          id="comment"
          label={"Din synpunkt" + this.state.validationError}
          value={this.state.comment}
          className={classes.text}
          onChange={this.handleChange("comment")}
          margin="normal"
          autoFocus={true}
        />
        <br />
        <Button color="primary" variant="contained" onClick={this.save(true)}>
          Skicka
        </Button>
        <Button color="primary" onClick={this.abort}>
          Avbryt
        </Button>
        {this.renderSaveError()}
      </div>
    );
  }

  renderTextField(name, rows, i) {
    const { classes } = this.props;
    return (
      <TextField
        key={i}
        rows={rows || 10}
        multiline={true}
        id="comment"
        label={name + this.state.validationError}
        value={this.state[name]}
        className={classes.text}
        onChange={this.handleChange(name)}
        margin="normal"
        autoFocus={isMobile ? false : true}
      />
    );
  }

  renderDropDownField(name, values, i) {
    const { classes } = this.props;
    return (
      <FormControl key={i} className={classes.formControl}>
        <InputLabel htmlFor={name}>{name}</InputLabel>
        <Select
          value={this.state[name] || ""}
          onChange={this.handleChange(name)}
          inputProps={{
            name: name,
            id: name
          }}
        >
          {values.map((value, i) => (
            <MenuItem key={i} value={value}>
              {value}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  renderForm() {
    const { form } = this.props;
    return form.map((input, i) => {
      switch (input.type) {
        case "text":
          return this.renderTextField(input.name, 1, i);
        case "textarea":
          return this.renderTextField(input.name, 10, i);
        case "option":
          return this.renderDropDownField(input.name, input.values, i);
        default:
          return this.renderTextField(input.name, 10, i);
      }
    });
  }

  renderPlace() {
    const { classes } = this.props;
    return (
      <div className={classes.form}>
        {this.state.placemarkVisible
          ? createPortal(
              <div className={classes.cross}>
                <PlaceIcon className={classes.placeIconMap} />
                <br />
                {this.renderOkButton()}
                <Snackbar
                  className={classes.anchorOriginBottomCenter}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "center"
                  }}
                  open={true}
                  onClose={() => {}}
                  ContentProps={{
                    "aria-describedby": "message-id"
                  }}
                  message={
                    <span id="message-id">
                      Drag i kartan för att placera markören på önskad plats
                    </span>
                  }
                />
              </div>,
              document.getElementById("map")
            )
          : null}
        {this.renderForm()}
        <Button color="primary" variant="contained" onClick={this.save(false)}>
          Skicka
        </Button>
        &nbsp;
        <Button color="primary" onClick={this.abort}>
          Avbryt
        </Button>
        <br />
        <FormControlLabel
          control={
            <Checkbox
              checked={this.state.displayPlace}
              onChange={() => {
                this.setState({
                  displayPlace: !this.state.displayPlace
                });
              }}
              value="displayPlace"
              color="primary"
            />
          }
          label="Jag vill visa min kommentar på kartan"
        />
        {this.renderSaveError()}
      </div>
    );
  }

  render() {
    switch (this.state.mode) {
      case "success":
        return this.renderSuccess();
      case "generic":
        return this.renderGeneric();
      case "place":
        return this.renderPlace();
      default:
        return this.renderStart();
    }
  }
}

export default withStyles(styles)(CollectorForm);
