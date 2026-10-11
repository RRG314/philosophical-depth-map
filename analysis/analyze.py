"""Engineering-tested descriptive analysis; never interpret synthetic output as findings."""
import argparse, csv, json, math, random, statistics
from pathlib import Path

def clean(rows):
    seen=set(); out=[]
    for row in rows:
        key=tuple(row[k] for k in ('participant','item','version','dimension','rater','occasion'))
        if key in seen: raise ValueError('Duplicate observation key; preserve revisions explicitly')
        seen.add(key)
        score=None if row['score'] in ('',None,'NA') else float(row['score'])
        maximum=float(row['maximum'])
        if maximum!=4 or score is not None and (not math.isfinite(score) or score not in range(5)): raise ValueError('Invalid ordinal score/maximum')
        out.append({**row,'score':score,'maximum':maximum})
    return out

def describe(rows):
    observed=[r for r in rows if r['score'] is not None]
    total=sum(r['score'] for r in observed); denominator=sum(r['maximum'] for r in observed)
    return dict(n=len(observed),missing=len(rows)-len(observed),sum=total,applicable_maximum=denominator,mean=total/len(observed) if observed else None,proportion_of_maximum=total/denominator if denominator else None)

def weighted_kappa(a,b):
    pairs=[(x,y) for x,y in zip(a,b,strict=True) if x is not None and y is not None]
    if not pairs:return None
    if any(x not in range(5) or y not in range(5) for x,y in pairs):raise ValueError('0–4 only')
    n=len(pairs); observed=sum((x-y)**2 for x,y in pairs)/n
    expected=sum((x-y)**2 for x,_ in pairs for _,y in pairs)/(n*n)
    return 1-observed/expected if expected else None

def validate_matrix(matrix):
    if matrix and (len({len(r) for r in matrix})!=1 or any(v is not None and (not isinstance(v,(float,int)) or not math.isfinite(v) or v not in range(5)) for r in matrix for v in r)):
        raise ValueError('Rectangular matrix of 0–4/None scores required')

def alpha(matrix):
    validate_matrix(matrix)
    complete=[row for row in matrix if all(x is not None for x in row)]
    if len(complete)<2 or len(complete[0])<2:return None
    k=len(complete[0]);total=statistics.variance([sum(row) for row in complete])
    return k/(k-1)*(1-sum(statistics.variance(col) for col in zip(*complete))/total) if total else None

def icc2(matrix):
    """Two-way random, single-measure absolute agreement ICC(2,1); complete rows."""
    validate_matrix(matrix)
    x=[r for r in matrix if all(v is not None for v in r)]
    if len(x)<2 or len(x[0])<2:return None
    n,k=len(x),len(x[0]);rows=[statistics.mean(r) for r in x];cols=[statistics.mean(c) for c in zip(*x)];grand=statistics.mean(rows)
    msr=k*sum((v-grand)**2 for v in rows)/(n-1);msc=n*sum((v-grand)**2 for v in cols)/(k-1)
    mse=sum((x[i][j]-rows[i]-cols[j]+grand)**2 for i in range(n) for j in range(k))/((n-1)*(k-1))
    denom=msr+(k-1)*mse+k*(msc-mse)/n
    return (msr-mse)/denom if denom else None

def bootstrap_mean(values,seed=20261010,repetitions=2000):
    values=[v for v in values if v is not None]
    if len(values)<2:return None
    rng=random.Random(seed);means=sorted(statistics.mean(rng.choices(values,k=len(values))) for _ in range(repetitions))
    return [means[int(.025*(repetitions-1))],means[int(.975*(repetitions-1))]]

def experimental_contrast(a,b):
    """Difference in independent participant mean outcomes; descriptive, no causal label."""
    a=[v for v in a if v is not None];b=[v for v in b if v is not None]
    if min(len(a),len(b))<2:return None
    difference=statistics.mean(a)-statistics.mean(b);se=math.sqrt(statistics.variance(a)/len(a)+statistics.variance(b)/len(b))
    return dict(difference=difference,standard_error=se,n_a=len(a),n_b=len(b))

def plot_trajectory(rows,path):
    # Mean by occasion; no invented interpolation outside observed occasions.
    occasions=sorted(set(r['occasion'] for r in rows));means=[describe([r for r in rows if r['occasion']==o])['mean'] for o in occasions]
    points=[(50+i*500/max(1,len(occasions)-1),260-50*m) for i,m in enumerate(means) if m is not None]
    circles=''.join(f'<circle cx="{x}" cy="{y}" r="4" fill="#176b70"/>' for x,y in points)
    import html
    labels=''.join(f'<text x="{50+i*500/max(1,len(occasions)-1)}" y="290" text-anchor="middle">{html.escape(o)}</text>' for i,o in enumerate(occasions))
    label='SYNTHETIC ENGINEERING FIXTURE' if all(r.get('synthetic')=='true' for r in rows) else 'Descriptive observed means'
    path.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="330" role="img"><title>Descriptive means by occasion; synthetic if input is synthetic</title><rect width="600" height="330" fill="white"/><path d="M50 40V260H560" stroke="black" fill="none"/>{circles}{labels}<text x="20" y="25">{label} — no causal or latent claim</text></svg>')

def run(source,out):
    rows=clean(list(csv.DictReader(source.open())));out.mkdir(parents=True,exist_ok=True)
    groups={}
    # Never combine raters, dimensions or occasions silently.
    for r in rows:groups.setdefault((r['dimension'],r['rater'],r['occasion']),[]).append(r)
    result={'synthetic':all(r.get('synthetic')=='true' for r in rows),'seed':20261010,'groups':{'|'.join(k):describe(v) for k,v in groups.items()},'items':{item:describe([r for r in rows if r['item']==item]) for item in sorted(set(r['item'] for r in rows))}}
    (out/'descriptives.json').write_text(json.dumps(result,indent=2))
    for number, key in enumerate(sorted(set((r['dimension'],r['rater']) for r in rows))):
        plot_trajectory([r for r in rows if (r['dimension'],r['rater'])==key],out/f'trajectory-{number}.svg')
    return result
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('input',type=Path);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args();run(args.input,args.output)
