import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles({
  root: { display: 'flex', alignItems: 'center', gap: 10, color: '#fff' },
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
  text: { fontWeight: 800, fontSize: 20, letterSpacing: 0.5 },
});

export const LogoFull = () => {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <div className={classes.mark}>W</div>
      <span className={classes.text}>wenia</span>
    </div>
  );
};
