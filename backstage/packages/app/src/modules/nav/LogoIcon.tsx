import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles({
  mark: {
    width: 30,
    height: 30,
    borderRadius: 9,
    background: 'linear-gradient(135deg, #2dd4bf, #8b7cff)',
    color: '#06212a',
    fontWeight: 800,
    display: 'grid',
    placeItems: 'center',
    fontSize: 18,
  },
});

export const LogoIcon = () => {
  const classes = useStyles();
  return <div className={classes.mark}>W</div>;
};
