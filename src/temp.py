l = 'fisrt1, last1; first2, last2; first3, last3'
l = (l.split('; '))
print(l)
c=0
for L  in l:
    l[c] = L.split(', ')
    c += 1
print(l)
print(l[0])
print(l[0][1])
for _ in range(len(l)):
    l.append(l[0][0])
    l.append(l[0][1])
    l.remove(l[0])
print(l)